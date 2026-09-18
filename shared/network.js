export function robinhoodNetwork(chainId = 4663) {
  if (![4663, 46630].includes(chainId)) throw new Error('Only Robinhood Chain mainnet and testnet are supported.')
  const testnet = chainId === 46630
  return {
    chainId, name: testnet ? 'Robinhood Chain Testnet' : 'Robinhood Chain',
    rpcUrl: testnet ? 'https://rpc.testnet.chain.robinhood.com' : 'https://rpc.mainnet.chain.robinhood.com',
    explorer: testnet ? 'https://explorer.testnet.chain.robinhood.com' : 'https://robinhoodchain.blockscout.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, testnet,
  }
}
