import { Client as DC_client, PresenceStatusData } from "discord.js";
import { Client as FB_client } from "fca-utils";
import handleEvent from "./handleEvent.js";

const dc_client = new DC_client({
    intents: ["MessageContent", "Guilds", "DirectMessages", "GuildMessages"]
})

const fb_client = new FB_client({
    prefix: process.env.PREFIX
})

dc_client.once('ready', () => {
    console.log(`[ DC ] Logged in as ${dc_client.user?.tag}`)

    dc_client.user?.setUsername(process.env.NAME!);

    const ActivityTypeOptions = [
        { name: "competing", type: 5 },
        { name: "custom", type: 4, },
        { name: "listening", type: 2 },
        { name: "playing", type: 0 },
        { name: "streaming", type: 1 },
        { name: "watching", type: 3 }
    ]

    const ActivityType = process.env["RICH_PRESENCE.TYPE"]

    dc_client.user?.setPresence({
        activities: [
            {
                name: process.env["RICH_PRESENCE.CONTENT"],
                type: ActivityTypeOptions.find(e => e.name === ActivityType)?.type
            }
        ],
        status: (process.env["RICH_PRESENCE.STATUS"] as PresenceStatusData)
    })
})
fb_client.once('ready', (_, bid) => {
    console.log(`[ FB ] Logged in as ${bid}`);

    handleEvent({ dc_client, fb_client });
});

dc_client.login(process.env.TOKEN);
fb_client.loginWithAppState(process.env.APPSTATE_BASE64 as string, { selfListen: false });