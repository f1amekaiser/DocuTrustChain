import { ethers, Wallet } from "ethers";

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress?: string;
  networkName: string;
}

export interface BlockchainTransaction {
  hash: string;
  blockNumber: number;
  gasUsed: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private config: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  /**
   * Store Merkle root hash on blockchain
   */
  public async storeMerkleRoot(merkleRoot: string, batchId: string): Promise<BlockchainTransaction> {
    try {
      // For demo purposes, we'll store the data in a transaction's data field
      // In production, you'd deploy a smart contract with proper storage functions
      
      const data = ethers.concat([
        ethers.toUtf8Bytes("MERKLE_ROOT:"),
        ethers.toUtf8Bytes(merkleRoot),
        ethers.toUtf8Bytes(":BATCH:"),
        ethers.toUtf8Bytes(batchId)
      ]);

      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address, // Self-transaction for demo
        value: ethers.parseEther("0"), // No value transfer
        data: data,
      });

      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber || 0,
        gasUsed: receipt?.gasUsed.toString() || "0",
        status: receipt?.status === 1 ? 'confirmed' : 'failed',
      };
    } catch (error) {
      console.error('Blockchain storage error:', error);
      throw new Error(`Failed to store Merkle root on blockchain: ${error}`);
    }
  }

  /**
   * Verify if a Merkle root exists on blockchain
   */
  public async verifyMerkleRoot(merkleRoot: string, transactionHash: string): Promise<boolean> {
    try {
      const tx = await this.provider.getTransaction(transactionHash);
      if (!tx || !tx.data) {
        return false;
      }

      // Decode the stored data
      const dataString = ethers.toUtf8String(tx.data);
      return dataString.includes(merkleRoot);
    } catch (error) {
      console.error('Blockchain verification error:', error);
      return false;
    }
  }

  /**
   * Get current blockchain status
   */
  public async getNetworkStatus(): Promise<{
    blockHeight: number;
    gasPrice: string;
    isConnected: boolean;
  }> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      const feeData = await this.provider.getFeeData();
      
      return {
        blockHeight: blockNumber,
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei'),
        isConnected: true,
      };
    } catch (error) {
      console.error('Network status error:', error);
      return {
        blockHeight: 0,
        gasPrice: '0',
        isConnected: false,
      };
    }
  }

  /**
   * Get transaction details
   */
  public async getTransactionDetails(hash: string): Promise<{
    blockNumber: number;
    status: 'pending' | 'confirmed' | 'failed';
    gasUsed: string;
  } | null> {
    try {
      const receipt = await this.provider.getTransactionReceipt(hash);
      if (!receipt) {
        return { blockNumber: 0, status: 'pending', gasUsed: '0' };
      }

      return {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error('Transaction details error:', error);
      return null;
    }
  }
}

// Create blockchain service instance
const w = Wallet.createRandom();

const blockchainConfig: BlockchainConfig = {
  rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.infura.io/v3/6320ef31103e43b0966494255ae046d8',
  privateKey: w.privateKey,
  networkName: 'sepolia',
};

export const blockchainService = new BlockchainService(blockchainConfig);
