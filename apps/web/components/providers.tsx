"use client"

import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit"
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import "@mysten/dapp-kit/dist/index.css"

const { networkConfig } = createNetworkConfig({
  testnet: {
    network: "testnet",
    url: getJsonRpcFullnodeUrl("testnet"),
  },
  mainnet: {
    network: "mainnet",
    url: getJsonRpcFullnodeUrl("mainnet"),
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const defaultNetwork = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet"

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider defaultNetwork={defaultNetwork} networks={networkConfig}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}
