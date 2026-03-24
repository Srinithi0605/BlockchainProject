// Initialize connecting to local Ganache network
const RPC_URL = "http://127.0.0.1:7545";
let provider;

try {
    // We use the globally injected ethers object from CDN
    provider = new ethers.JsonRpcProvider(RPC_URL);
} catch (e) {
    console.error("Ethers initialization error:", e);
}

const blocksContainer = document.getElementById("blocks-container");
const latestBlockEl = document.getElementById("latest-block-val");
const totalTxEl = document.getElementById("total-tx-val");
const refreshBtn = document.getElementById("refresh-btn");

let totalTransactions = 0;

async function fetchBlocks() {
    try {
        if (!provider) return;
        
        const latestBlockNumber = await provider.getBlockNumber();
        latestBlockEl.textContent = `#${latestBlockNumber}`;
        
        let txCount = 0;
        let html = '';
        
        // Fetch last 15 blocks
        const startBlock = Math.max(0, latestBlockNumber - 15);
        
        if (latestBlockNumber === 0) {
             html = '<div class="loading-state">Genesis block only. Verify an identity to see transactions!</div>';
        }

        for (let i = latestBlockNumber; i >= startBlock; i--) {
            const block = await provider.getBlock(i);
            if (!block) continue;
            
            txCount += block.transactions.length;
            
            const timeStr = new Date(block.timestamp * 1000).toLocaleString();
            
            const shortHash = block.hash.substring(0, 18) + '...' + block.hash.substring(block.hash.length - 8);
            
            html += `
                <div class="block-item">
                    <div class="block-main">
                        <div class="block-icon">Bk</div>
                        <div class="block-details">
                            <span class="block-number">Block #${block.number}</span>
                            <span class="block-time">${timeStr}</span>
                            <span class="block-hash">${shortHash}</span>
                        </div>
                    </div>
                    <div class="block-meta">
                        <div class="meta-item">
                            <span class="meta-label">Transactions:</span> 
                            <span class="meta-val">${block.transactions.length}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Gas Used:</span> 
                            <span class="meta-val">${block.gasUsed.toString()}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        totalTxEl.textContent = txCount;
        blocksContainer.innerHTML = html || '<div class="loading-state">No blocks found.</div>';
        
    } catch (err) {
        console.error("Error fetching blocks:", err);
        blocksContainer.innerHTML = `<div class="loading-state" style="color: #ff7b72;">Connection failed. Is Ganache running?</div>`;
        document.querySelector('.stat-value.connected').textContent = 'Disconnected';
        document.querySelector('.stat-value.connected').style.color = '#ff7b72';
        document.querySelector('.status-indicator').style.backgroundColor = '#ff7b72';
        document.querySelector('.status-indicator').style.boxShadow = '0 0 10px #ff7b72';
    }
}

// Initial pull
fetchBlocks();

// Handle manual refresh
refreshBtn.addEventListener('click', () => {
    refreshBtn.style.opacity = '0.5';
    fetchBlocks().finally(() => {
        setTimeout(() => refreshBtn.style.opacity = '1', 300);
    });
});

// Auto-listen to new blocks if possible
if (provider) {
    provider.on("block", () => {
        fetchBlocks();
    });
}
