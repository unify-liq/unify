import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { http, createConfig } from "wagmi";
import { mainnet, base, arbitrum, optimism, polygon, zora, bsc, worldchain, soneium, unichain } from "wagmi/chains";

export const config = createConfig({
  chains: [mainnet, base, arbitrum, optimism, polygon, zora, bsc, worldchain, soneium, unichain],
  connectors: [miniAppConnector()],
  transports: {
    [mainnet.id]:    http(),
    [base.id]:       http(),
    [arbitrum.id]:   http(),
    [optimism.id]:   http(),
    [polygon.id]:    http(),
    [zora.id]:       http(),
    [bsc.id]:        http(),
    [worldchain.id]: http(),
    [soneium.id]:    http(),
    [unichain.id]:   http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}