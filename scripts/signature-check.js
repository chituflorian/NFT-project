const express = require("express");
const { ethers } = require("ethers");
const app = express();
app.use(express.json());

// Define a list of allowlisted wallets
const allowlistedAddresses = [
	"0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
	"0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
	"0x90f79bf6eb2c4f870365e785982e1f101e93b906",
	"0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
	"0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
];

const privateKey =
	"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const signer = new ethers.Wallet(privateKey);

const PROVIDER_URL =
	"wss://eth-sepolia.g.alchemy.com/v2/Fp4JVHrqG8xP8RCV45u-D-AlL1ZixFRw";

const provider = new ethers.WebSocketProvider(PROVIDER_URL);
// const signer = provider.getSigner();
const contractABI = require("./abi.json");
const contractAddress = "0xa41794eC4084Fa6335dB25F2C3C1afda0687a56C";
const contract = new ethers.Contract(contractAddress, contractABI, provider);

app.post("/check-address", async (req, res) => {
	const { address } = req.body;

	// Check if address is in allowlist
	if (allowlistedAddresses.includes(address)) {
		// Compute message hash
		const messageHash = ethers.id(address);

		// Sign the message hash
		let messageBytes = ethers.getBytes(messageHash);
		const signature = await signer.signMessage(messageBytes);

		res.json({
			status: "success",
			signature,
		});
	} else {
		res.json({
			status: "error",
			message: "Address not in the allowlist",
		});
	}
});

const port = process.env.PORT || 3000;

contract.on("Minted", (minter, quantity, event) => {
	console.log("Minter: ", minter);
	console.log("Quantity: ", quantity.toString());
	console.log("Event: ", event);
});

async function syncTotalPublicMint() {
	const lastProcessedBlock = 0;
	const eventFilter = contract.filters.Minted();
	const events = await contract.queryFilter(
		eventFilter,
		lastProcessedBlock + 1
	);

	for (let event of events) {
		console.log(event);
	}
}

syncTotalPublicMint().then(() => {
	app.listen(port, () => {
		console.log(`Server is running on port ${port}`);
	});
});
