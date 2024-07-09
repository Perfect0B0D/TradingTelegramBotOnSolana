import TelegramBot from 'node-telegram-bot-api';
import { Keypair, PublicKey} from "@solana/web3.js";
import bs58 from "bs58";
import connectDb from './DB_config/database/db.js'; 

import {productionMode } from './lib/config.js';
import {isTokenAddress, getSolBalace, getUser, shortAddress, getTokenData, buyToken, updateUserSettings } from './lib/common.js';
import { startMenuContext,eachWalletContext, exportPrivateKeyContext, buyMenuContext, buyContext, sellContext, sellMenuContext, helpContext, settingContext } from './lib/contents.js';

connectDb();

const { CallbackQuery, Message } = TelegramBot;
let tokenAddress = null, tokenAccount = null;

let messageIdList = {
    successPurchage: {},
    configure: {},
    err: {},
    invalidAdr:{}
}


const token = process.env.MAIN_BOT_TOKEN || '';
const bot = new TelegramBot(token, { polling: true });

console.log('Bot started!')

bot.on('callback_query', async (query) => {
    const userId = query.message?.chat.id
    const msgId = query.message?.message_id
    const action = query.data.split(':')[0];

    let title, contents, context;
    let userData = await getUser(userId);
    const wallet = Keypair.fromSecretKey(bs58.decode(userData.wallets[0].walletPrivate));
    const solBalance = await getSolBalace(userData.wallets[0].walletAddress);

    if(messageIdList.invalidAdr[userId]){
        bot.deleteMessage(userId, messageIdList.invalidAdr[userId])
        messageIdList.invalidAdr[userId] = undefined
    }
    console.log(`${userId} -> ${action} (${query.message.chat.username})`);
    try {
        switch (action) {
            case 'export_private_key':
                let eachWalletNum = parseInt(query.data.split(':')[1]);
                [ title, contents ] = await exportPrivateKeyContext(eachWalletNum);
                context = bot.sendMessage(
                    userId,
                    title,
                    {
                        reply_markup: {
                            inline_keyboard: contents
                        },
                        parse_mode: 'HTML',
                    },
                )
                messageIdList.configure[userId] = (await context).message_id
                break;

            case 'prev':
                let currentWalletNum = parseInt(query.data.split(':')[1]);
                [title, contents ] = await eachWalletContext(userData, `${currentWalletNum == 1?12:currentWalletNum-1}`);
                context = bot.sendMessage(
                    userId,
                    title,
                    {
                        reply_markup: {
                            inline_keyboard: contents
                        },
                        parse_mode: 'HTML',
                    },
                );
                messageIdList.configure[userId] = (await context).message_id
                break;

            case 'next':
                    let currentWalletNumForNext = parseInt(query.data.split(':')[1]);
                    [title, contents ] = await eachWalletContext(userData, `${currentWalletNumForNext == 12?1:currentWalletNumForNext+1}`);
                    context = bot.sendMessage(
                        userId,
                        title,
                        {
                            reply_markup: {
                                inline_keyboard: contents
                            },
                            parse_mode: 'HTML',
                        },
                    );
                    messageIdList.configure[userId] = (await context).message_id;
                    break;

            case 'export_yes':
                const walletNum = parseInt(query.data.split(':')[1]);
                console.log(walletNum);
                bot.sendMessage(userId, `Your Private Key is:\n\n` +
                    `<code>${userData.wallets[walletNum-1].walletPrivate}</code>\n\n` +
                    `You can now e.g import the key into a wallet like Solflare. (tap to copy).\n` +
                    `This message should auto-delete in 1 minute. If not, delete this message once you are done.`, { parse_mode: 'HTML'}
                ).then((sentMessage) => {
                    // Message has been sent, now schedule its deletion
                    setTimeout(() => {
                      bot.deleteMessage(userId, sentMessage.message_id).catch((error) => {
                        console.error('Failed to delete message:', error);
                      });
                    }, 60000); // 60000 ms = 1 minute
                  }).catch((error) => {
                    console.error('Failed to send message:', error);
                  });
                break;
            
            case 'export_no':
                try{ bot.deleteMessage(userId, msgId); } catch(e) { console.log(e);}
                break;

            case 'refresh':
                [ title, contents ] = await startMenuContext(userData);
                context = bot.sendMessage(
                    userId,
                    title,
                    {
                        reply_markup: {
                            inline_keyboard: contents
                        },
                        parse_mode: 'HTML',
                    },
                )
                messageIdList.configure[userId] = (await context).message_id
                break;
            
            case 'wallet':
                let currentWalletNumForRefresh = parseInt(query.data.split(':')[1]);
                [title, contents] = await eachWalletContext(userData, currentWalletNumForRefresh);
                context = bot.sendMessage(
                    userId,
                    title,
                    {
                        reply_markup: {
                            inline_keyboard: contents
                        },
                        parse_mode: 'HTML',
                    },
                );
                messageIdList.configure[userId] = (await context).message_id
                break;
           
            case 'slippage_buy':
                let slippage_buy_edit = true;
                bot.sendMessage(userId, `Reply with your new slippage setting for buys in % (0 - 100%).\nExample: 5`);
                bot.on("message", async(message) => {
                    if(message.chat.id !== userId) return;
                    if(slippage_buy_edit) {
                        const amount = parseFloat(message.text);
                        if(amount <= 0 || amount > 100) {
                            bot.sendMessage(userId, "Please enter correct amount!!!");
                            slippage_buy_edit = false;
                            return;
                        }
                        try {
                            const newSettings = {
                                numberOfAttempts: userData.settings.numberOfAttempts,
                                buySlippage: amount,
                                sellSlippage: userData.settings.sellSlippage
                            }
                            const updatedUser = await updateUserSettings(newSettings, userData);
                            if(updatedUser) {
                                userData = updatedUser;
                                bot.sendMessage(userId, "Updated the slippage amount!");;
                            }
                        } catch(e) {
                            console.log(e);
                            bot.sendMessage(userId, "Something went wrong!");;
                        }
                    }

                });
                break;

            case 'slippage_sell':
                let slippage_sell_edit = true;
                bot.sendMessage(userId, `Reply with your new slippage setting for buys in % (0 - 100%).\nExample: 5`);
                bot.on("message", async(message) => {
                    if(message.chat.id !== userId) return;
                    if(slippage_sell_edit) {
                        const amount = parseFloat(message.text);
                        if(amount <= 0 || amount > 100) {
                            bot.sendMessage(userId, "Please enter correct amount!!!");
                            slippage_buy_edit = false;
                            return;
                        }
                        try {
                            const newSettings = {
                                numberOfAttempts: userData.settings.numberOfAttempts,
                                buySlippage: userData.settings.buySlippage,
                                sellSlippage: amount
                            }
                            const updatedUser = await updateUserSettings(newSettings, userData);
                            if(updatedUser) {
                                userData = updatedUser;
                                bot.sendMessage(userId, "Updated the slippage amount!");;
                            }
                        } catch(e) {
                            console.log(e);
                            bot.sendMessage(userId, "Something went wrong!");;
                        }
                    }

                });
                break;
            
            case 'tokenAddress':
                let tokenAddress_edit = true;
                bot.sendMessage(userId,`Please share the token address that your wallets will be trading\n
                             current trading token address is ${userData.settings.tokenAddress}`);
                bot.on("message", async(message) => {
                    if(message.chat.id !== userId) return;
                    if(tokenAddress_edit){
                        const address = message.text;
                        const isToken = await isTokenAddress(address);
                        console.log("isToken===>", isToken);
                        if(!isToken){
                            bot.sendMessage(userId, "Please enter correct token address.");
                            tokenAddress_edit = false;
                            return;
                        }
                        try{
                            const newSttings = {
                                buySlippage: userData.settings.buySlippage,
                                sellSlippage: userData.settings.sellSlippage,
                                tokenAddress: address
                            }
                            const updatedUser = await updateUserSettings(newSttings, userData);
                            if(updatedUser){
                                userData = updatedUser;
                                bot.sendMessage(userId, `updated the trading token address as a ${address}`);
                            }
                        }
                        catch(e){
                            console.log(e);
                            bot.sendMessage(userId, "Something went wrong!");
                        }
                    }
                });
                 break;
            
            case 'start':{
                let currentWalletNumForStart = parseInt(query.data.split(':')[1]);
            }
            default:
                break;
        }
    } catch (e) {
        console.log(e)
    }

})

bot.on(`message`, async (msg) => {
    const userId = msg.chat.id
    const text = msg.text
    const msgId = msg.message_id
    
    let title, contents, context;
    const userData = await getUser(userId);

    console.log(`${userId} -> ${text}`);
    if(messageIdList.invalidAdr[userId]){
        try{
            await bot.deleteMessage(userId, messageIdList.invalidAdr[userId])
        } catch(e) {
            // console.log(e)
        }
        messageIdList.invalidAdr[userId] = undefined
    }

    try {
        switch (text) {
            case `/start`:
                [ title, contents ] = await startMenuContext(userData);
                context = bot.sendMessage(
                    userId,
                    title,
                    {
                        reply_markup: {
                            inline_keyboard: contents
                        },
                        parse_mode: 'HTML',
                    },
                )
                messageIdList.configure[userId] = (await context).message_id
                break;
            default:
                const match = text.match(/^\/([1-9]|1[0-5])$/);
                if (match) {
                    const walletNum = parseInt(match[1]);
                    [title, contents ] = await eachWalletContext(userData, walletNum);
                    context = bot.sendMessage(
                        userId,
                        title,
                        {
                            reply_markup: {
                                inline_keyboard: contents
                            },
                            parse_mode: 'HTML',
                        },
                    );
                    messageIdList.configure[userId] = (await context).message_id
                } else {
                    // Delete invalid messages
                    try {
                        await bot.deleteMessage(userId, msgId);
                    } catch (e) {
                        // Ignore delete message errors
                    }
                }
                break;
        }
    } catch (e) {
        console.log(e)
    }
});


bot.setMyCommands([{command:"start", description:"Display Main Menu"}])