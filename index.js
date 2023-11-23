const { Client, MessageButton, MessageActionRow, MessageSelectMenu, TextInputComponent, Modal, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const { Database } = require("st.db");
const temp_channels_db = new Database("./temp_channels.json");
const client = new Client({
    intents: 32767
});

client.on("ready", async () => {
    console.log("Bot is online!");
    console.log("Code by Wick Studio");
    console.log(" discord.gg/z82w57MzUC");
});

client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild) return;
    if (message.content.startsWith(config.prefix + "temp")) {
        if (!message.member.permissions.has("ADMINISTRATOR")) return message.reply("ليس لديك الإذن لاستخدام هذا الأمر ❌");

        let args = message.content.split(" ");
        let embeds = [{
            author: { name: "Temp Channel Dashboard", icon_url: message.guild.iconURL() },
            description: `قم بالضغط على الازرار تحت للتحكم بالروم الصوتي الخاص بك`,
            image: {
                url: `https://media.discordapp.net/attachments/918613591584825355/1177175877788905503/t7kom5555_1.png?ex=65718d78&is=655f1878&hm=cfa574cd7a1142ccc74940b4c2bd664ab8ca8b7d1fd22d8b22ee7ffddfc8a6f0&=&format=webp&width=1209&height=675`
            },
            color: 0x0cd8fa
        }];
        let MessageSelectMenuOptions = [];
        config.voiceLimits.forEach(num => {
            MessageSelectMenuOptions.push({ label: `${num == 0 ? "No Limit" : num}`, value: `${num}` });
        });

        let row1 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`temp_public_${Date.now()}`)
                    .setStyle('SECONDARY')
                    .setEmoji(config.emojis.public)
                    .setLabel("Unlock"),
                new MessageButton()
                    .setCustomId(`temp_private_${Date.now()}`)
                    .setStyle('SECONDARY')
                    .setEmoji(config.emojis.private)
                    .setLabel("Lock"),
                new MessageButton()
                    .setCustomId(`temp_unmute_${Date.now()}`)
                    .setStyle('SECONDARY')
                    .setEmoji(config.emojis.unmute)
                    .setLabel("Unmute"),
                new MessageButton()
                    .setCustomId(`temp_mute_${Date.now()}`)
                    .setStyle('SECONDARY')
                    .setEmoji(config.emojis.mute)
                    .setLabel("Mute"),
                new MessageButton()
                    .setCustomId(`temp_rename_${Date.now()}`)
                    .setStyle('SECONDARY')
                    .setEmoji(config.emojis.rename)
                    .setLabel("Change Name"),
            );

        let row2 = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`temp_disconnect_${Date.now()}`)
                    .setStyle('DANGER')
                    .setEmoji(config.emojis.disconnect)
                    .setLabel("Disconnect"),
                new MessageButton()
                    .setCustomId(`temp_hide_${Date.now()}`)
                    .setStyle('PRIMARY')
                    .setEmoji(config.emojis.hide)
                    .setLabel("Hide"),
                new MessageButton()
                    .setCustomId(`temp_unhide_${Date.now()}`)
                    .setStyle('PRIMARY')
                    .setEmoji(config.emojis.unhide)
                    .setLabel("Unhide"),
                new MessageButton()
                    .setCustomId(`temp_kickuser_${Date.now()}`)
                    .setStyle('PRIMARY')
                    .setEmoji(config.emojis.unhide)
                    .setLabel("Kick User"),
            );

        let row3 = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('temp_limit_' + Date.now())
                    .setPlaceholder('عدد الاعضاء الذي يمكننهم الدخول')
                    .setMaxValues(1)
                    .setMinValues(1)
                    .addOptions(MessageSelectMenuOptions),
            );

        message.channel.send({ embeds, components: [row1, row2, row3] }).then(() => {
            message.delete().catch(() => { });
        });
    }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
    if (newState.channelId !== null && newState.channelId == config.channelVoiceId) {
        newState.guild.channels.create(newState.member.user.username, {
            permissionOverwrites: [{
                id: newState.member.id,
                allow: ['SEND_MESSAGES', 'VIEW_CHANNEL', 'MANAGE_CHANNELS'],
            }, {
                id: newState.guild.id,
                deny: ['SEND_MESSAGES'],
            }],
            parent: config.categoryId,
            type: 2,
            reason: 'Temp channel Bot by Wick'
        }).then(async (channeltemp) => {
            await newState.setChannel(channeltemp, 'Temp channel Bot by Wick');
            await temp_channels_db.set(channeltemp.id, newState.member.id);
        }).catch(console.error);
    }

    if (oldState.channelId !== null && temp_channels_db.has(oldState.channelId)) {
        if (oldState.channel.members.filter(x => !x.user.bot).size == 0) {
            let channel = oldState.guild.channels.cache.get(oldState.channelId);
            await channel.delete();
            await temp_channels_db.delete(oldState.channelId);
        }
    }
});

client.on("interactionCreate", async interaction => {
    if (interaction.isSelectMenu()) {
        if (interaction.customId.startsWith("temp_limit")) {
            if (interaction.member.voice.channelId == null || interaction.member.voice.channelId !== null && !temp_channels_db.has(interaction.member.voice.channelId)) return await interaction.reply({ content: "You Don't Have a Channel ❌", ephemeral: true });
            if (!interaction.member.voice.channel.permissionsFor(interaction.member).has("MANAGE_CHANNELS")) return await interaction.reply({ content: "ليس لديك الإذن بالتحكم في القناة المؤقتة ❌", ephemeral: true });

            await interaction.deferReply({ ephemeral: true });
            await interaction.member.voice.channel.setUserLimit(+interaction.values[0]).catch(console.error);

            await interaction.editReply({
                embeds: [{
                    title: "Done ✅",
                    fields: [{ name: "Selected Channel", value: `<#${interaction.member.voice.channelId}>` }],
                    color: 0x0cd8fa,
                    timestamp: new Date()
                }],
                ephemeral: true
            });
        }
    }
    if (interaction.customId.startsWith("temp_rename")) {
        if (interaction.isModalSubmit()) {
            await interaction.reply({
                ephemeral: true, embeds: [{
                    title: "Please Wait",
                    description: `Your Temp Channel is Changing`,
                    fields: [{ name: "Note:", value: "تحذير : إذا قمت بتغيير الاسم أكثر من مرتين ، فلا يمكنك تغيير اسمك الجديد مرة أخرى لمدة 10 دقائق" }],
                    color: 0x0cd8fa
                }]
            })
            let guild = await client.guilds.fetch(interaction.guildId)
            let channel = await guild.channels.cache.get(interaction.customId.split("_")[2]);
            await channel.edit({
                name: interaction.fields.getTextInputValue('new_name'),
            }).catch(console.error)
            await interaction.editReply({
                embeds: [{
                    title: "Done ✅",
                    fields: [{ name: "Selected Channel", value: `<#${interaction.member.voice.channelId}>` }],
                    color: 0x0cd8fa,
                    timestamp: new Date()
                }], ephemeral: true
            })
        }
    }
    if (interaction.customId.startsWith("temp_kick_confirm")) {
        const channelId = interaction.customId.split('_')[3];
        const selectedMemberId = interaction.values[0];
        const channel = interaction.guild.channels.cache.get(channelId);
        const memberToKick = interaction.guild.members.cache.get(selectedMemberId);
        if (memberToKick) {
            await memberToKick.voice.disconnect('Kicked from the temp channel by owner.');
        }
        // Create the embed
        const kickConfirmationEmbed = new MessageEmbed()
            .setColor('#FF0000')
            .setTitle('Member Kicked')
            .setDescription(`Kicked ${memberToKick.displayName} from the temp channel.`);

        await interaction.reply({
            embeds: [kickConfirmationEmbed],
            ephemeral: true
        });
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith("temp")) {
            if (interaction.member.voice.channelId == null || (interaction.member.voice.channelId !== null && !temp_channels_db.has(interaction.member.voice.channelId))) {
                return await interaction.reply({ embeds: [{ color: 'RED', description: "You Don't Have a Channel ❌" }], ephemeral: true });
            }
            if (!interaction.member.voice.channel.permissionsFor(interaction.member).has("MANAGE_CHANNELS")) {
                return await interaction.reply({ embeds: [{ color: 'RED', description: "You do not have permission to control the temporary Channel ❌" }], ephemeral: true });
            }
            const channelOwnerId = temp_channels_db.get(interaction.member.voice.channelId);
            if (interaction.member.id !== channelOwnerId) {
                return await interaction.reply({ embeds: [{ color: 'RED', description: "You are not the owner of this channel ❌" }], ephemeral: true });
            }
            try {
                switch (interaction.customId.split("_")[1]) {
                    case "rename":
                        break;
                    case "private":
                        await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false });
                        await interaction.reply({ embeds: [{ color: 'GREEN', description: "This channel is now private. Only selected members can view it." }], ephemeral: true });
                        break;
                    case "public":
                        await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true });
                        await interaction.reply({ embeds: [{ color: 'GREEN', description: "This channel is now public. Everyone can view it." }], ephemeral: true });
                        break;
                    case "unmute":
                        await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.id, { SPEAK: true });
                        await interaction.reply({ embeds: [{ color: 'GREEN', description: "Channel is now unmuted. Members can speak freely." }], ephemeral: true });
                        break;
                    case "mute":
                        await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.id, { SPEAK: false });
                        await interaction.reply({ embeds: [{ color: 'GREEN', description: "Channel is now muted. Members cannot speak." }], ephemeral: true });
                        break;
                    case "disconnect":
                        await interaction.member.voice.disconnect();
                        await interaction.reply({ embeds: [{ color: 'ORANGE', description: "You have been disconnected from the voice channel." }], ephemeral: true });
                        break;
                    case "hide":
                        await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: false });
                        await interaction.reply({ embeds: [{ color: 'GREEN', description: "This channel is now hidden from non-members." }], ephemeral: true });
                        break;
                    case "unhide":
                        await interaction.member.voice.channel.permissionOverwrites.edit(interaction.guild.id, { VIEW_CHANNEL: true });
                        await interaction.reply({ embeds: [{ color: 'GREEN', description: "This channel is now visible to everyone." }], ephemeral: true });
                        break;
                    case "kickuser":
                        if (!interaction.member.voice.channel) return;
                        if (!temp_channels_db.has(interaction.member.voice.channelId)) return;

                        const memberOptions = [];
                        interaction.member.voice.channel.members.forEach(member => {
                            if (!member.user.bot) {
                                memberOptions.push({
                                    label: member.displayName,
                                    value: member.id
                                });
                            }
                        });

                        const kickSelectMenu = new MessageSelectMenu()
                            .setCustomId('temp_kick_confirm_' + interaction.member.voice.channelId + '_' + Date.now())
                            .setPlaceholder('Select Member to Kick')
                            .addOptions(memberOptions);

                        const actionRow = new MessageActionRow()
                            .addComponents(kickSelectMenu);

                        await interaction.reply({ content: 'Select a member to kick:', components: [actionRow], ephemeral: true });
                        break;
                    default:
                        await interaction.reply({ embeds: [{ color: 'RED', description: "Unknown command." }], ephemeral: true });
                }
            } catch (error) {
                console.error(error);
                await interaction.reply({ embeds: [{ color: 'RED', description: "An error occurred while processing your request." }], ephemeral: true });
            }
        }
    }
});

client.login(config.token);
