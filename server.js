require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TronWeb = require('tronweb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// === CONFIGURACIÓN Y VARIABLES DE ENTORNO ===
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || "cf3e2b3b-8d92-4cf9-822a-6928a494b60a";
const CONTRACT_ADDRESSES = {
  TOKEN: process.env.TOKEN_ADDRESS || "T_DIRECCION_DE_TU_TOKEN_TRC20",
  STAKING: process.env.STAKING_ADDRESS || "TGaGtugb1myFiUAsfhffTruPX2PAnsw6Cp",
  GOVERNANCE: process.env.GOVERNANCE_ADDRESS || "T_DIRECCION_DE_TU_GOBERNANZA"
};

// Inicialización del cliente TronWeb
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-HEADER': TRONGRID_API_KEY }
});

// Cache global en memoria
let cacheState = {
  lastUpdated: null,
  stakingBalanceTRX: "0",
  stakingStatus: "active",
  tokenStatus: "active"
};

// Tarea periódica de monitoreo (Polling cada 30s)
async function syncBlockchainState() {
  try {
    const balanceSun = await tronWeb.trx.getBalance(CONTRACT_ADDRESSES.STAKING);
    cacheState.stakingBalanceTRX = tronWeb.fromSun(balanceSun);
    cacheState.lastUpdated = new Date().toISOString();
    console.log(`[SYNC OK] Balance del Vault: ${cacheState.stakingBalanceTRX} TRX`);
  } catch (error) {
    console.error('[SYNC ERROR] Fallo al sincronizar con TronGrid:', error.message);
  }
}

setInterval(syncBlockchainState, 30000);
syncBlockchainState();

// === ENDPOINTS DE LA API REST ===

// Healthcheck y estado general
app.get('/health', (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Resumen del estado global del sistema yhwhcore
app.get('/api/v1/system/status', (req, res) => {
  res.json({
    success: true,
    network: "TRON Mainnet",
    contracts: CONTRACT_ADDRESSES,
    metrics: cacheState
  });
});

// Consultar métricas de cualquier dirección pública
app.get('/api/v1/account/:address', async (req, res) => {
  const { address } = req.params;

  if (!tronWeb.isAddress(address)) {
    return res.status(400).json({ success: false, error: "Dirección de TRON inválida." });
  }

  try {
    const accountInfo = await tronWeb.trx.getAccount(address);
    const balanceSun = accountInfo.balance || 0;

    res.json({
      success: true,
      address,
      balanceTRX: tronWeb.fromSun(balanceSun),
      createTime: accountInfo.create_time || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Error al consultar la cuenta.", details: error.message });
  }
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend yhwhcore escuchando en el puerto ${PORT}`);
});