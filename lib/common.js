import { LAMPORTS_PER_SOL, PublicKey, Keypair, VersionedTransaction } from "@solana/web3.js";
import { fetchMetadata, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import bs58 from "bs58";
import axios from "axios";
import { getUserData, createUser, checkUserExists, updateWallet, updateSettings } from "../DB_config/database/model/user.js";
import { connection, RPC_URL } from "./config.js";
import { Wallet } from '@coral-xyz/anchor';

const umi = createUmi(RPC_URL);

export const getUser = async (userId) => {
  console.log("getUser");
  let userData;
  const userExists = await checkUserExists(userId);
  if (!userExists) {
    const wallets = [];
    for (let i = 0; i < 15; i++) {
      const wallet = Keypair.generate();
      wallets.push({
        walletAddress: wallet.publicKey.toString(),
        walletPrivate: bs58.encode(wallet.secretKey),
      });
    }
    const newUser = {
      userId: userId,
      wallets: wallets,
      settings: {
        buySlippage: 30,
        sellSlippage: 30
      }
    };
    userData = await createUser(newUser);
  } else {
    userData = await getUserData(userId);
  }
  return userData;
}

export const getSolBalace = async (walletAddress) => {
  const amount = await connection.getBalance(new PublicKey(walletAddress));
  const fixAmount = amount / LAMPORTS_PER_SOL;
  return fixAmount;
}

export const shortAddress = (address, startLength = 4, endLength = 4) => {
  if (address === undefined) return undefined
  if (address.length <= startLength + endLength) {
    return address; // No need to shorten
  }
  const start = address.substring(0, startLength);
  const end = address.substring(address.length - endLength);
  return `${start}...${end}`;
}

export const resetWallet = async (userData) => {
  const wallet = Keypair.generate();
  const walletData = {
    walletAddress: wallet.publicKey.toString(),
    walletPrivate: bs58.encode(wallet.secretKey)
  }
  const result = await updateWallet(userData.userId, walletData);
  return result;
}


export const getTokenData = async (tokenAddress) => {
  try {
    //get the metadata on chain
    const metadataPda = findMetadataPda(umi, { mint: publicKey(tokenAddress) })
    const metadata = await fetchMetadata(umi, metadataPda)

    const getTokenSupply = await connection.getTokenSupply(new PublicKey(tokenAddress));
    const supply = getTokenSupply.value.amount;
    const decimals = getTokenSupply.value.decimals;
    // const uiAmount = getTokenSupply.value.uiAmount;

    // token price
    const getPrice = await axios.get(`https://price.jup.ag/v6/price?ids=${tokenAddress}`);
    const price = getPrice.data.data[tokenAddress] ? getPrice.data.data[tokenAddress].price : 0;

    return {
      mint: tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      supply,
      decimals,
      price,
    }
  } catch (e) {
    console.log(e);
    return undefined;
  }
}

export const buyToken = async (walletSecretKey, mintAddress, amount, slippage) => {
  const signature = await buyInJupiter(walletSecretKey, mintAddress, amount, slippage);
  return signature;
};

// Function to schedule the sell transaction exactly 5 minutes after buying
const scheduleSell = (walletSecretKey, mintAddress, amount, slippage) => {
  setTimeout(async () => {
    try {
      const sellSignature = await sellInJupiter(walletSecretKey, mintAddress, amount, slippage);
      console.log(`Sold token with transaction: ${sellSignature}`);
    } catch (error) {
      console.error('Error during selling:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes in milliseconds
};

// Function to start the auto trading loop exactely buy token between 2 to 7 mintes
export const startTrading = (walletSecretKey, mintAddress, amount, slippage) => {
  const tradingLoop = async () => {
    while (true) {
      try {
        // Buy token
        const buySignature = await buyInJupiter(walletSecretKey, mintAddress, amount, slippage);
        console.log(`Bought token with transaction: ${buySignature}`);

        // Schedule the sell transaction exactly 5 minutes later
        scheduleSell(walletSecretKey, mintAddress, amount, slippage);
      } catch (error) {
        console.error('Error during buying:', error);
      }

      // Wait for a random interval between 2 to 7 minutes before next buy
      const randomInterval = Math.floor(Math.random() * (7 - 2 + 1) + 2) * 60 * 1000;
      await new Promise(resolve => setTimeout(resolve, randomInterval));
     }
    };
  // Start the trading loop
  tradingLoop();
 }

const buyInJupiter = async (walletSecretKey, mintAddress, amount, slippage) => {
  const inputMint = "So11111111111111111111111111111111111111112";
  const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(walletSecretKey)));
  const outputMint = mintAddress;
  const inputAmount = amount * LAMPORTS_PER_SOL;
  const slippageBps = slippage
  const quoteResponse = await (
    await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount}&slippageBps=${slippageBps}`
    )
  ).json();

  // get serialized transactions for the swap
  const data = await (
    await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // quoteResponse from /quote api
        quoteResponse,
        // user public key to be used for the swap
        userPublicKey: wallet.publicKey.toString(),
        // auto wrap and unwrap SOL. default is true
        dynamicComputeUnitLimit: true,  // allow dynamic compute limit instead of max 1,400,000
        prioritizationFeeLamports: 0.001 * LAMPORTS_PER_SOL, // or custom lamports: 1000
        wrapAndUnwrapSol: true,
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
        // feeAccount: "fee_account_public_key"
      })
    })
  ).json();

  // deserialize the transaction
  const swapTransactionBuf = Buffer.from(data.swapTransaction, 'base64');
  var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  // const priorityFeeInstruction = await createDynamicPriorityFeeInstruction()
  // console.log('transaction message', transaction.message.compiledInstructions)
  // console.log('priorityFeeInstruction', priorityFeeInstruction)

  // sign the transaction
  transaction.sign([wallet.payer]);

  // Execute the transaction
  const rawTransaction = transaction.serialize()
  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 5,
  });
  try {
    console.log('Waiting to confirm the transaction: ', `https://solscan.io/tx/${txid}`)
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash: latestBlockHash.blockhash, lastValidBlockHeight: latestBlockHash.lastValidBlockHeight, signature: txid });
    console.log('Confirmed')
    return txid
  } catch (err) {
    console.log('Retrying buy in jupiter')
    await buyInJupiter(walletSecretKey, mintAddress, amount, slippage)
  }

}

const sellInJupiter = async (walletSecretKey, mintAddress, amount, slippage) => {
  const outputMint = "So11111111111111111111111111111111111111112"
  const inputMint = mintAddress
  const wallet = new Wallet(Keypair.fromSecretKey(bs58.decode(walletSecretKey)));
  const slippageBps = slippage

  const inputAmount = amount;

  const quoteResponse = await (
    await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount}&slippageBps=${slippageBps}`
    )
  ).json();

  // get serialized transactions for the swap
  const data = await (
    await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // quoteResponse from /quote api
        quoteResponse,
        // user public key to be used for the swap
        userPublicKey: wallet.publicKey.toString(),
        // auto wrap and unwrap SOL. default is true
        dynamicComputeUnitLimit: true,  // allow dynamic compute limit instead of max 1,400,000
        prioritizationFeeLamports: 0.001 * LAMPORTS_PER_SOL, // or custom lamports: 1000
        wrapAndUnwrapSol: true,
        // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
        // feeAccount: "fee_account_public_key"
      })
    })
  ).json();

  // deserialize the transaction
  const swapTransactionBuf = Buffer.from(data.swapTransaction, 'base64');
  var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  // const priorityFeeInstruction = await createDynamicPriorityFeeInstruction()
  // console.log('transaction message', transaction.message.compiledInstructions)
  // console.log('priorityFeeInstruction', priorityFeeInstruction)

  // sign the transaction
  transaction.sign([wallet.payer]);

  // Execute the transaction
  const rawTransaction = transaction.serialize()
  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 5,
  });
  try {
    console.log('Waiting to confirm the transaction: ', `https://solscan.io/tx/${txid}`)
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({ blockhash: latestBlockHash.blockhash, lastValidBlockHeight: latestBlockHash.lastValidBlockHeight, signature: txid });
    console.log('Confirmed')
    return txid
  } catch (err) {
    console.log('Retrying to sell in jupiter')
    await sellInJupiter(walletSecretKey, mintAddress, amount, slippage)
  }
}




export const updateUserSettings = async (newSettings, userData) => {
  const updatedUserData = await updateSettings(userData.userId, newSettings);
  return updatedUserData;
}

export const getTokenAddress = (inputString) => {
  // Define the regular expression to match the token address
  const regex = /[A-HJ-NP-Za-km-z1-9]{32,44}/;

  // Use the regex to find a match in the input string
  const match = inputString.match(regex);

  // If a match is found, return the first match (token address)
  if (match) {
    return match[0];
  } else {
    // If no match is found, return null or an appropriate message
    return null;
  }
}



// 

const isValidSolanaAddress = (address) => {
  try {
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch (e) {
    console.log(e);
    return false;
  }
};

export const isTokenAddress = async (address) => {
  if (!isValidSolanaAddress(address)) {
    return false;
  }

  try {
    const publicKey = new PublicKey(address);
    const tokenAccountInfo = await connection.getParsedAccountInfo(publicKey);
    if (tokenAccountInfo.value === null) {
      return false;
    }

    const response = await fetch('https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json');
    const data = await response.json();
    const tokenInfo = data.tokens.find(token => token.address === address);
    return tokenInfo !== undefined;
  } catch (error) {
    console.error('Error checking token address:', error);
    return false;
  }
};




