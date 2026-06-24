import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useWalletClient, usePublicClient } from "wagmi";
import { createAcrossClient } from "@across-protocol/app-sdk";
import { parseUnits, createPublicClient, http, type Address } from "viem";
import {
  base, arbitrum, optimism, mainnet,
  polygon, zora, bsc, worldchain, soneium, unichain
} from "wagmi/chains";

// ============================================================
// CONFIGURACIÓN
// ============================================================
const INTEGRATOR_ID = "0x01ad" as `0x${string}`; // ← pega tu ID aquí

const acrossClient = createAcrossClient({
  integratorId: INTEGRATOR_ID,
  chains: [mainnet, base, arbitrum, optimism, polygon, zora, bsc, worldchain, soneium, unichain],
});

const CHAINS = [
  { id: mainnet.id,    name: "Ethereum",  chain: mainnet    },
  { id: base.id,       name: "Base",      chain: base       },
  { id: arbitrum.id,   name: "Arbitrum",  chain: arbitrum   },
  { id: optimism.id,   name: "Optimism",  chain: optimism   },
  { id: polygon.id,    name: "Polygon",   chain: polygon    },
  { id: zora.id,       name: "Zora",      chain: zora       },
  { id: bsc.id,        name: "BNB Chain", chain: bsc        },
  { id: worldchain.id, name: "WorldChain",chain: worldchain },
  { id: soneium.id,    name: "Soneium",   chain: soneium    },
  { id: unichain.id,   name: "Unichain",  chain: unichain   },
];

// Direcciones reales de tokens por chain
const TOKEN_ADDRESSES: Record<string, Partial<Record<number, Address>>> = {
  USDC: {
    [mainnet.id]:    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    [base.id]:       "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    [arbitrum.id]:   "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    [optimism.id]:   "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    [polygon.id]:    "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    [bsc.id]:        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    [worldchain.id]: "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1",
  },
  WETH: {
    [mainnet.id]:  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    [base.id]:     "0x4200000000000000000000000000000000000006",
    [arbitrum.id]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    [optimism.id]: "0x4200000000000000000000000000000000000006",
  },
  USDT: {
    [mainnet.id]:  "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    [arbitrum.id]: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    [optimism.id]: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    [polygon.id]:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    [bsc.id]:      "0x55d398326f99059fF775485246999027B3197955",
  },
  DAI: {
    [mainnet.id]:  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    [arbitrum.id]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    [optimism.id]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    [polygon.id]:  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
};

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6, USDT: 6, WETH: 18, DAI: 18,
};

// ============================================================
// APP
// ============================================================
function App() {
  useEffect(() => { sdk.actions.ready(); }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Unify</h1>
        <p style={styles.subtitle}>Bridge across any chain</p>
      </div>
      <BridgeWidget />
    </div>
  );
}

// ============================================================
// BRIDGE WIDGET
// ============================================================
function BridgeWidget() {
  const { isConnected, address } = useAccount();
  const { connect, connectors }  = useConnect();
  const { data: walletClient }   = useWalletClient();
  const originPublicClient       = usePublicClient();

  const [fromChain, setFromChain] = useState(CHAINS[1]); // Base
  const [toChain,   setToChain]   = useState(CHAINS[2]); // Arbitrum
  const [tokenSym,  setTokenSym]  = useState("USDC");
  const [amount,    setAmount]    = useState("");
  const [quote,     setQuote]     = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [executing, setExecuting] = useState(false);
  const [status,    setStatus]    = useState("");

  // Tokens disponibles para la ruta seleccionada
  const availableTokens = Object.keys(TOKEN_ADDRESSES).filter(
    sym => TOKEN_ADDRESSES[sym][fromChain.id] && TOKEN_ADDRESSES[sym][toChain.id]
  );

  const getQuote = async () => {
    if (!amount || !address) return;
    const inputAddress  = TOKEN_ADDRESSES[tokenSym][fromChain.id];
    const outputAddress = TOKEN_ADDRESSES[tokenSym][toChain.id];
    if (!inputAddress || !outputAddress) {
      setStatus("❌ Token not supported on this route");
      return;
    }
    setLoading(true);
    setQuote(null);
    setStatus("");
    try {
      const q = await acrossClient.getQuote({
        route: {
          originChainId:      fromChain.id,
          destinationChainId: toChain.id,
          inputToken:         inputAddress,
          outputToken:        outputAddress,
        },
        inputAmount: parseUnits(amount, TOKEN_DECIMALS[tokenSym]),
      });
      setQuote(q);
    } catch (e: any) {
      setStatus("❌ " + (e.message || "No route found"));
    }
    setLoading(false);
  };

  const executeBridge = async () => {
    if (!quote || !walletClient || !originPublicClient) return;
    setExecuting(true);
    setStatus("Preparing...");
    try {
      const destPublicClient = createPublicClient({
        chain:     toChain.chain,
        transport: http(),
      });

      await acrossClient.executeQuote({
        walletClient:      walletClient as any,
        originClient:      originPublicClient as any,
        destinationClient: destPublicClient as any,
        deposit:           quote.deposit,
        integratorId:      INTEGRATOR_ID,
        onProgress: (progress: any) => {
          if (progress.step === "approve" && progress.status === "txPending")
            setStatus("⏳ Approving token...");
          if (progress.step === "approve" && progress.status === "txSuccess")
            setStatus("✅ Approved!");
          if (progress.step === "deposit" && progress.status === "txPending")
            setStatus("⏳ Sending to bridge...");
          if (progress.step === "deposit" && progress.status === "txSuccess")
            setStatus("✅ Deposited! Waiting for fill...");
          if (progress.step === "fill" && progress.status === "txPending")
            setStatus("⚡ Filling on " + toChain.name + "...");
          if (progress.step === "fill" && progress.status === "txSuccess")
            setStatus("🎉 Done! Funds arrived on " + toChain.name);
          if (progress.status === "error" || progress.status === "txError")
            setStatus("❌ " + (progress.error?.message || "Error"));
        },
      });
    } catch (e: any) {
      setStatus("❌ " + (e.message || "Transaction failed"));
    }
    setExecuting(false);
  };

  if (!isConnected) {
    return (
      <div style={styles.card}>
        <p style={styles.hint}>Connect your wallet to start bridging</p>
        <button style={styles.button} onClick={() => connect({ connector: connectors[0] })}>
          Connect Wallet
        </button>
      </div>
    );
  }

  const decimals    = TOKEN_DECIMALS[tokenSym];
  const outputAmt   = quote ? (Number(quote.deposit.outputAmount) / 10 ** decimals).toFixed(4) : null;
  const fee         = quote && amount ? (Number(amount) - Number(outputAmt)).toFixed(4) : null;
  const fillTimeSec = quote?.estimatedFillTimeSec ?? 2;

  return (
    <div style={styles.card}>

      {/* FROM */}
      <div style={styles.row}>
        <label style={styles.label}>From</label>
        <select style={styles.select} value={fromChain.id} onChange={e => {
          const c = CHAINS.find(c => c.id === Number(e.target.value))!;
          setFromChain(c); setQuote(null); setStatus("");
        }}>
          {CHAINS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* TO */}
      <div style={styles.row}>
        <label style={styles.label}>To</label>
        <select style={styles.select} value={toChain.id} onChange={e => {
          const c = CHAINS.find(c => c.id === Number(e.target.value))!;
          setToChain(c); setQuote(null); setStatus("");
        }}>
          {CHAINS.filter(c => c.id !== fromChain.id).map(c =>
            <option key={c.id} value={c.id}>{c.name}</option>
          )}
        </select>
      </div>

      {/* TOKEN */}
      <div style={styles.row}>
        <label style={styles.label}>Token</label>
        <select style={styles.select} value={tokenSym} onChange={e => {
          setTokenSym(e.target.value); setQuote(null); setStatus("");
        }}>
          {availableTokens.length > 0
            ? availableTokens.map(t => <option key={t} value={t}>{t}</option>)
            : <option disabled>No tokens for this route</option>
          }
        </select>
      </div>

      {/* AMOUNT */}
      <div style={styles.row}>
        <label style={styles.label}>Amount</label>
        <input
          style={styles.input}
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={e => { setAmount(e.target.value); setQuote(null); setStatus(""); }}
        />
      </div>

      {/* GET QUOTE */}
      <button
        style={styles.buttonSecondary}
        onClick={getQuote}
        disabled={loading || !amount || availableTokens.length === 0}
      >
        {loading ? "Getting quote..." : "Get Quote"}
      </button>

      {/* QUOTE */}
      {quote && (
        <div style={styles.quoteBox}>
          <div style={styles.quoteRow}>
            <span>You receive</span>
            <span style={styles.quoteValue}>{outputAmt} {tokenSym}</span>
          </div>
          <div style={styles.quoteRow}>
            <span>Fee</span>
            <span style={styles.quoteFee}>{fee} {tokenSym}</span>
          </div>
          <div style={styles.quoteRow}>
            <span>Est. time</span>
            <span style={styles.quoteValue}>~{fillTimeSec}s</span>
          </div>
        </div>
      )}

      {/* BRIDGE */}
      {quote && (
        <button style={styles.button} onClick={executeBridge} disabled={executing}>
          {executing ? "Bridging..." : `Bridge ${amount} ${tokenSym} →`}
        </button>
      )}

      {/* STATUS */}
      {status && <div style={styles.status}>{status}</div>}

    </div>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh", background: "#0a0a0a",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "24px 16px", fontFamily: "'Inter', sans-serif", color: "#fff",
  },
  header:   { textAlign: "center", marginBottom: "24px" },
  title: {
    fontSize: "28px", fontWeight: "700", margin: "0 0 4px",
    background: "linear-gradient(90deg, #7c3aed, #2563eb)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  subtitle: { fontSize: "14px", color: "#666", margin: 0 },
  card: {
    background: "#141414", borderRadius: "16px", padding: "20px",
    width: "100%", maxWidth: "380px", border: "1px solid #222",
  },
  row:   { display: "flex", flexDirection: "column", marginBottom: "12px" },
  label: { fontSize: "12px", color: "#888", marginBottom: "4px", fontWeight: "500" },
  select: {
    background: "#1e1e1e", border: "1px solid #333", borderRadius: "8px",
    color: "#fff", padding: "10px 12px", fontSize: "14px", outline: "none",
  },
  input: {
    background: "#1e1e1e", border: "1px solid #333", borderRadius: "8px",
    color: "#fff", padding: "10px 12px", fontSize: "16px", outline: "none",
    width: "100%", boxSizing: "border-box",
  },
  button: {
    width: "100%", padding: "14px",
    background: "linear-gradient(90deg, #7c3aed, #2563eb)",
    border: "none", borderRadius: "12px", color: "#fff",
    fontSize: "16px", fontWeight: "600", cursor: "pointer", marginTop: "8px",
  },
  buttonSecondary: {
    width: "100%", padding: "12px", background: "#1e1e1e",
    border: "1px solid #333", borderRadius: "12px", color: "#aaa",
    fontSize: "14px", cursor: "pointer", marginTop: "4px", marginBottom: "12px",
  },
  quoteBox: {
    background: "#1a1a2e", borderRadius: "10px", padding: "12px",
    marginBottom: "12px", border: "1px solid #2a2a4a",
  },
  quoteRow: {
    display: "flex", justifyContent: "space-between",
    fontSize: "13px", color: "#aaa", marginBottom: "6px",
  },
  quoteValue: { color: "#fff", fontWeight: "600" },
  quoteFee:   { color: "#f59e0b" },
  status: {
    marginTop: "12px", padding: "10px", background: "#1e1e1e",
    borderRadius: "8px", fontSize: "13px", color: "#aaa", textAlign: "center",
  },
  hint: { textAlign: "center", color: "#666", fontSize: "14px", marginBottom: "16px" },
};

export default App;