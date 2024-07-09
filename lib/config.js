import { Connection, clusterApiUrl } from "@solana/web3.js";
import dotenv from 'dotenv';
dotenv.config();

export const RPC_URL = process.env.RPC_URL || clusterApiUrl("devnet");
export const COMMITMETN_LEVEL = process.env.COMMITMETN_LEVEL || "confirmed";
export const connection = new Connection(RPC_URL, COMMITMETN_LEVEL);
export const productionMode = process.env.PRODUCTION_MODE || "devnet";