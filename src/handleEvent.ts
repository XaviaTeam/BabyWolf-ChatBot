import { ChannelMap } from "./database/index.js";
import { ChannelType, EmbedBuilder, GuildBasedChannel, MessagePayload } from "discord.js";
import type { Client as dc_client, Guild } from "discord.js";
import type { Client as fb_client } from "fca-utils";
import { getStream } from "./utils.js";

type HandleEventOption = {
    dc_client: dc_client,
    fb_client: fb_client
}

type FbMessageOption = {
    content?: string
    embeds?: EmbedBuilder[],
    files?: {
        attachment: unknown,
        name: string
    }[]
}

type CreateChannelOption = {
    guild: Guild;
    threadID: string,
    cate: GuildBasedChannel,
    client: dc_client
}

type DcMessageOption = {
    body: string,
    attachment?: any | any[]
}

async function createChannel({ guild, threadID, cate, client }: CreateChannelOption) {
    try {
        const channel = await guild?.channels.create({
            name: threadID,
            type: ChannelType.GuildText,
            parent: cate?.id,
            permissionOverwrites: [
                {
                    id: process.env.ADMINID!,
                    allow: ['ViewChannel']
                },
                {
                    id: client.user?.id!,
                    allow: ['ViewChannel', 'SendMessages', 'ManageChannels']
                },
                {
                    id: process.env.GUILDID!,
                    deny: ['SendMessages', 'ManageChannels']
                }
            ]

        })

        await ChannelMap.create({ channelID: channel?.id!, threadID: threadID });
    } catch (e) {
        console.error(e)
    }
}

function getExt(url: string) {
    let matchUrl = url.substring(url.lastIndexOf("/")).match(/([^.]+)\?/g)![0]
    return '.' + matchUrl.slice(matchUrl.length * -1, -1);
}

export default async function handleEvent({ dc_client, fb_client }: HandleEventOption) {
    var data = await ChannelMap.findAll();
    var guild = await dc_client.guilds.fetch(process.env.GUILDID!);

    dc_client.on("messageCreate", async (message) => {
        try {
            const channel = data.find(e => e.dataValues.channelID == message.channelId)
            if (!channel) return;
            if (message.author.bot) return;
            let option: DcMessageOption = {
                body: `${message.content}\n\n${message.author.tag}`
            }

            let attachments = Array.from(message.attachments.values())

            if (attachments.length != 0) {
                option.attachment = [];
                for (let atm of attachments) {
                    option.attachment.push((await getStream(atm.url)))
                }
            }

            fb_client.getApi()?.sendMessage(option as unknown as string, channel.threadID).catch(e => console.error(e))
        } catch (e) {
            console.error(e)
        }
    })

    fb_client.on("message", async (message) => {
        try {
            const thread = data.find(e => e.dataValues.threadID == message.threadID)
            if (!thread) {
                let cate = guild.channels.cache.find(
                    (c) => c.name.toLowerCase() === "facebook" && c.type === ChannelType.GuildCategory);

                if (!cate) return;

                await createChannel({ guild, threadID: message.threadID, cate, client: dc_client })

                data = await ChannelMap.findAll();
            } else {
                const channel = await guild.channels.fetch(thread.dataValues.channelID)
                if (channel?.isTextBased()) {
                    let options: FbMessageOption = {}
                    let { attachments } = message

                    let embed = new EmbedBuilder()
                        .setColor('Random')
                        .setFooter({
                            "text": `From ${message.senderID}\nIn ${message.threadID}`,
                            "iconURL": `https://graph.facebook.com/${message.senderID}/picture?type=large&width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
                        })
                        .setTimestamp()
                    if (attachments.length == 1) {
                        if ((attachments[0].type === "photo" || attachments[0].type === "sticker" || attachments[0].type === "animated_image")) {
                            embed.setImage(attachments[0].url)
                            options.embeds = [embed]
                        } else if (attachments[0].type === "video" || attachments[0].type === "audio") {
                            if (attachments[0].type === "audio" && getExt(attachments[0].url) === ".mp4") {
                                embed.setDescription('.mp4 format audio files are not supported')
                                options.embeds = [embed]
                            } else {
                                options.files = [{ attachment: attachments[0].url, name: attachments[0].filename }];
                                options.content = message.body + `\n\nFrom ${message.senderID}\nIn ${message.threadID}`
                            }
                        } else {
                            embed.setDescription('(location, file or share)')
                            options.embeds = [embed]
                        }
                    } else if (attachments.length > 1) {
                        options.files = []
                        for (let atm of attachments) {
                            if (atm.type === "location" || atm.type === "file" || atm.type === "share" || (atm.type === "audio" && getExt(atm.url) == ".mp4")) continue;
                            options.files.push({ attachment: atm.url, name: atm.ID + getExt(atm.url)[0] })
                        }
                        options.content = message.body + `\n\nFrom ${message.senderID}\nIn ${message.threadID}`
                    } else {
                        embed.setDescription(message.body != '' ? message.body : ' ');
                        options.embeds = [embed]
                    }
                    await channel.send(options as unknown as MessagePayload);
                }
            }
        } catch (e) {
            console.error(e)
        }
    })

    fb_client.on("event", async (event) => {
        try {
            if (event.logMessageType === "log:subscribe") {
                const thread = await ChannelMap.findOne({ where: { threadID: event.threadID } })
                if (!thread) {
                    let cate = guild.channels.cache.find(
                        (c) => c.name.toLowerCase() === "facebook" && c.type === ChannelType.GuildCategory);
                    if (!cate) return;

                    await createChannel({ guild, threadID: event.threadID, cate, client: dc_client })

                    data = await ChannelMap.findAll();
                }

                fb_client.getApi()?.changeNickname(process.env.NAME as string, event.threadID, event.author)
            }
            if (event.logMessageType === "log:unsubscribe") {
                if (await ChannelMap.findOne({ where: { threadID: event.threadID } })) {
                    await Promise.all([
                        ChannelMap.destroy({
                            where: {
                                threadID: event.threadID
                            }
                        })
                    ])
                }
            }
        } catch (e) {
            console.error(e)
        }
    })
}