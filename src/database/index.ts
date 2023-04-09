import { Sequelize, DataTypes, Model, type InferAttributes, type InferCreationAttributes } from "sequelize";

const sequelize = new Sequelize({
    storage: 'data.sqlite',
    dialect: 'sqlite',
    logging: false
})

interface ChannelMap extends Model<InferAttributes<ChannelMap>, InferCreationAttributes<ChannelMap>> {
    channelID: string;
    threadID: string
}

export const ChannelMap = sequelize.define<ChannelMap>('ChannelMaps', {
    channelID: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    threadID: {
        type: DataTypes.STRING
    }
}, {
    timestamps: false
})

ChannelMap.sync({ force: false });