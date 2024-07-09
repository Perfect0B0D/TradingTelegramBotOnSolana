import axios from "axios";
import { getSolBalace,shortAddress } from "./common.js";
import { productionMode } from "./config.js";

export const startMenuContext = async (userData) => {

  let title = `<b>Welcome to Auto Trading on Solana!</b>\n\n` +
               `We created 15 unique SOL wallets for you to fund and trade through. It is advisable to fund each wallet from ` +
               `different addresses to avoid attention(n.f.a)\n\n` +
               `<b><u><i>Your Auto-Trading Wallets</i></u></b>\n\n`;
  const solBalancePromises = userData.wallets.map(wallet => getSolBalace(wallet.walletAddress));
  const solBalances = await Promise.all(solBalancePromises);
               
  for(let i = 0; i<15; i++){
    let walletAddres = userData.wallets[i].walletAddress;
    let shortAddres = shortAddress(walletAddres , 6, 6);
    let solBalance = solBalances[i];
    let ticker = userData.wallets[i].ticker;
    let status = userData.wallets[i].status;
    
    title += `/ ${i + 1} <code>${shortAddres}</code> \n` + 
             `SOL Balance: ${solBalance} SOL\n` +
             `TICKER: ${ticker} TIKCER \n`+
             `Status: ${status}\n\n` ;
  }

  const contents = [
      [{ text: `Start Trading(all)`, callback_data: `startAll` }, { text: `Pause Trading(all)`, callback_data: `pauseAll` }],
      [{ text: `Settings`, callback_data: `settings` }, { text: `Token Address`, callback_data: `tokenAddress` }],
      [{ text: `Refresh`, callback_data: `refresh` }],
  ];

  return [ title, contents ];
}
export const eachWalletContext = async (userData, walletNum) => {
  const wallet = userData.wallets[walletNum];
  
  const walletAddress = wallet.walletAddress;
  const ticker = wallet.ticker;
  const status = wallet.status;
  const solBalance = await getSolBalace(walletAddress);
  const title = `Wallet ${walletNum}:\n` +
              `<code>${walletAddress}</code>\n\n` +
              `SOL Balance: <b>${solBalance} SOL</b>\n\n` +
              `TICKER balance: ${ticker} TICKER\n\n` +
              `Status: ${status}`;

  const action = 'export_private_key';
  const callbackData = `${action}:${walletNum}`;
  const prevCallbackData = `prev:${walletNum}`;
  const nextCallbackData = `next:${walletNum}`;
  const refreshCallbackData = `wallet:${walletNum}`;

  const contents = [
    [{ text: `Start Trading`, callback_data: `start:${walletNum}` },{ text: `Pause Trading`, callback_data: `pause:${walletNum}` }],
    [{ text: `◀️ Prev`, callback_data: prevCallbackData },{ text: `Next ▶️`, callback_data: nextCallbackData }],
    [{ text: `Export Private Key`, callback_data: callbackData },
     { text: `View on Solscan`, url: `https://solscan.io/account/${walletAddress}${productionMode === "devnet" && "?cluster=devnet"}` }],
    [{ text: `Home`, callback_data: `refresh` }, { text: `Refresh`, callback_data: refreshCallbackData }]
  ]

  return [ title, contents ]
}

export const walletContent = async (userData) => {
  const solBalance = await getSolBalace(userData.wallet.walletAddress);

  const title = `Your Wallet:\n\n` +
              `Address: <code>${userData.wallet.walletAddress}</code>\n` +
              `Balance: <b>${solBalance} SOL</b>\n\n` +
              `Tap to copy the address and send SOL to deposit.`

  const contents = [
      [{ text: `View on Solscan`, url: `https://solscan.io/account/${userData.wallet.walletAddress}${productionMode === "devnet" && "?cluster=devnet"}` }, { text: `Close`, callback_data: `close` }],
      [{ text: `Deposit SOL`, callback_data: `deposit` }],
      [{ text: `Withdraw all SOL`, callback_data: `withdraw_all` }, { text: `Withdraw X SOL`, callback_data: `withdraw_x` }],
      [{ text: `Reset Wallet`, callback_data: `reset_wallet` }, { text: `Export Private Key`, callback_data: `export_private_key` }],
      [{ text: `Refresh`, callback_data: `wallet` }]
  ]

  return [ title, contents ]
}

export const depositContext = async (userData) => {
  const title = `To deposit send SOL to below address:\n` +
                      `<code>${userData.wallet.walletAddress}</code>`
  return title;
}

export const resetWalletContext = async () => {
  const title = `Are you sure you want to reset your SuperBot  Wallet?\n\n` +
                `<b>WARNING</b>: This action is irreversible!\n\n` +
                `SuperBot will generate a new wallet for you and discard your old one.`
  const contents = [
    [{ text: `🔴 Cancel`, callback_data: 'reset_no' }, {text: `🟢 Confirm`, callback_data: 'reset_yes'}],
  ]

  return [ title, contents ];
}

export const exportPrivateKeyContext = async (walletNum) => {
  const action = 'export_yes';
  const callbackData = `${action}:${walletNum}`;
  const title = `Are you sure you want to export your Private Key?`
  const contents = [
    [{ text: `🔴 Cancel`, callback_data: 'export_no' }, {text: `🟢 Confirm`, callback_data: callbackData}],
  ]
  return [ title, contents ];
}

export const buyContext = async () => {
  const title = `Buy Token:\n\n` +
              `To buy a token, enter a token address or a URL from pump.fun or Birdeye.`
  const contents = [
    [{ text: `Close`, callback_data: `close` }]
  ]

  return [ title, contents ];
}

export const buyMenuContext = async (userData, tokenData) => {
  const solBalance = await getSolBalace(userData.wallet.walletAddress);

  const title = `${tokenData.symbol} | ${tokenData.name} |\n` +
              `<code>${tokenData.mint}</code>\n\n` +
              `Price: $${tokenData.price}\n` +
              `Market Cap: \$${tokenData.supply / tokenData.decimals * tokenData.price}\n\n` +
              `Wallet Balance: ${solBalance} SOL\n` +
              `To buy press one of the buttons below.`
  const contents = [
    [{ text: `Cancel`, callback_data: `close` }],
    [{ text: `Exporer`, url: `https://solscan.io/token/${tokenData.mint}${productionMode === "devnet" ? "?cluster=devnet" : ''}`}, { text: `Birdeye`, url: `https://birdeye.so/token/${tokenData.mint}?chain=solana`}],
    [{ text: `Buy 1.0 SOL`, callback_data: `buy_1_sol` }, { text: `Buy 5.0 SOL`, callback_data: `buy_5_sol` }, { text: `Buy X SOL`, callback_data: `buy_x_sol` }],
    [{ text: `Refresh`, callback_data: `refresh` }]
  ]

  return [ title, contents ]
}

export const sellContext = async () => {
  const title = `Sell Token:\n\n` +
              `To sell a token, enter a token address from your wallet.`
  const contents = [
    [{ text: `Close`, callback_data: `close` }]
  ]

  return [ title, contents ];
}

export const sellMenuContext = async (userData, tokenData) => {
  const solBalance = await getSolBalace(userData.wallet.walletAddress);

  const title = `${tokenData.symbol} | ${tokenData.name} |\n` +
              `<code>${tokenData.mint}</code>\n\n` +
              `Price: $${tokenData.price}\n` +
              `Market Cap: \$${tokenData.supply / tokenData.decimals * tokenData.price}\n\n` +
              `Wallet Balance: ${solBalance} SOL\n` +
              `To buy press one of the buttons below.`
  const contents = [
    [{ text: `Close`, callback_data: `close` }],
    [{ text: `Buy 1.0 SOL`, callback_data: `buy_1_sol` }, { text: `Buy 5.0 SOL`, callback_data: `buy_5_sol` }, { text: `Buy X SOL`, callback_data: `buy_x_sol` }],
    [{ text: `Sell 25%`, callback_data: `sell_25` }, { text: `Sell 100%`, callback_data: `sell_all` }, { text: `Sell x %`, callback_data: `sell_x` }],
    [{ text: `Exporer`, url: `https://solscan.io/token/${tokenData.mint}${productionMode === "devnet" ? "?cluster=devnet" : ''}`}, { text: `Birdeye`, url: `https://birdeye.so/token/${tokenData.mint}?chain=solana`} ],
    [{ text: `Refresh`, callback_data: `refresh` }]
  ]

  return [ title, contents ]
}

export const helpContext = async () => {
  const title = `Help:\n\n` +
                `<b>Which tokens can I trade?</b>\nAny SPL token that is a Sol pair, on Raydium, Orca, and Jupiter. We pick up raydium pairs instantly, and Jupiter will pick up non sol pairs within around 15 minutes\n\n` +
                `<b>I want to create a new wallet on BONKbot.</b>\nClick the Wallet button or type /wallet, and you will be able to configure your new wallets\n\n` +
                `Is BONKbot free? How much do I pay for transactions?\nBONKbot is completely free! We charge 1% on transactions, and keep the bot free so that anyone can use it.\n\n` +
                `<b>Why is My Net Profit Lower Than Expected?</b>\nYour Net Profit is calculated after deducting all associated costs, including Price Impact, Transfer Tax, Dex Fees, and a 1% BONKbot fee. This ensures the figure you see is what you actually receive, accounting for all transaction-related expenses.\n\n` +
                `<b>Is there a difference between @test_bonk_bot and the backup bots?</b>\nNo, they are all the same bot and you can use them interchangeably. If one is slow or down, you can use the other ones. You will have access to the same wallet and positions.\n\n` +
                `Further questions? Join our Telegram group:\nhttps://t.me/BONKbotChat`
  const contents = [
    [{ text: `Close`, callback_data: `close` }]
  ]
  return [title, contents];
}

export const settingContext = async (userData) => {
  const title = `Settings:\n\n` +
              `<b>SLIPPAGE CONFIG</b>\nCustomize your slippage settings for buys and sells. Tap to edit.\nMax Price Impact is to protect against trades in extremely illiquid pools.\n\n`;
  const contents = [
    [{ text: "--- SLIPPAGE CONFIG ---", callback_data: 'title'}],
    [{ text: `✏️ Buy: ${userData.settings.buySlippage}%`, callback_data: 'slippage_buy'}, { text: `✏️ Sell: ${userData.settings.sellSlippage}%`, callback_data: 'slippage_sell'}],
    [{ text: "Close", callback_data: 'close'}],
  ]
  return [title, contents];
}