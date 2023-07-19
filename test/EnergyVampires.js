const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// const { expect } = require("chai");
// const { ethers, waffle } = require("hardhat");

async function setupContracts() {
    const EnergyVampires = await ethers.getContractFactory("EnergyVampires");
    const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const energyVampires = await EnergyVampires.deploy();

    return { energyVampires, owner, addr1, addr2, addrs };
}

async function whitelistSignature() {
    const allowlistedAddresses = [
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        // '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', // addr2
        '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
        '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc',
    ];

    const address = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const signer = new ethers.Wallet(privateKey);

    let messageHash, signature;
    if (allowlistedAddresses.includes(address)) {
        messageHash = ethers.id(address);

        let messageBytes = ethers.getBytes(messageHash);
        signature = await signer.signMessage(messageBytes);
    }

    return { messageHash, signature };
}

async function nonWhitelistSignature() {
    const address = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
    const privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
    const signer = new ethers.Wallet(privateKey);

    let messageHash = ethers.id(address);
    let messageBytes = ethers.getBytes(messageHash);
    let signature = await signer.signMessage(messageBytes);

    return { messageHash, signature };
}

describe("EnergyVampires", function () {
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);
            expect(await energyVampires.owner()).to.equal(owner.address);
        });
    });

    describe("Minting", function () {
        it("Should not allow to mint more than MAX_PUBLIC_MINT", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await energyVampires.togglePublicSale();
            await energyVampires.connect(addr1).mint(10, { value: ethers.parseEther("0.99") });
            await expect(
                energyVampires.connect(addr1).mint(1, { value: ethers.parseEther("0.099") })
            ).to.be.revertedWith("Energy Vampires :: Already minted 3 times!");
        });
    });

    describe("Whitelist Minting", function () {
        it("Should be able to mint", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await energyVampires.toggleWhiteListSale();
            const { messageHash, signature } = await loadFixture(whitelistSignature);

            await expect(energyVampires.connect(addr1).whitelistMint(1, messageHash, signature, { value: ethers.parseEther("0.0799") }))
                .to.be.fulfilled;
        })

        it("Should NOT be able to mint", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await energyVampires.toggleWhiteListSale();
            const { messageHash, signature } = await loadFixture(nonWhitelistSignature);

            await expect(energyVampires.connect(addr2).whitelistMint(1, messageHash, signature, { value: ethers.parseEther("0.0799") }))
                .to.be.revertedWith("Energy Vampires :: Address is not allowlisted");;
        })

        it("Should NOT allow to mint more than MAX_WHITELIST_MINT", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await energyVampires.toggleWhiteListSale();
            const { messageHash, signature } = await loadFixture(whitelistSignature);

            await expect(
                energyVampires.connect(addr1).whitelistMint(4, messageHash, signature, { value: ethers.parseEther("0.0799") })
            ).to.be.revertedWith("Energy Vampires :: Cannot mint beyond whitelist max mint!");
        });
    });

    describe("Team Minting", function () {
        it("Should allow only owner to mint for team", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(
                energyVampires.connect(addr1).teamMint()
            ).to.be.revertedWith("Ownable: caller is not the owner");
            await energyVampires.teamMint();
        });

        it("Should not allow team minting more than once", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await energyVampires.teamMint();
            await expect(
                energyVampires.teamMint()
            ).to.be.revertedWith("Energy Vampires :: Team already minted");
        });

        it("Allow owner to mint for team", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(
                energyVampires.connect(owner).teamMint()
            ).to.be.fulfilled;
        });
    });

    describe("Toggle Pause", function () {
        it("Should allow owner to toggle pause", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.togglePause()).to.emit(energyVampires, "PauseToggled").withArgs(true);
            expect(await energyVampires.pause()).to.equal(true);
            await expect(energyVampires.togglePause()).to.emit(energyVampires, "PauseToggled").withArgs(false);
            expect(await energyVampires.pause()).to.equal(false);
        });

        it("should prevent non-owners from toggling pause", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.connect(addr2).togglePause()).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Toggle Whitelist", function () {
        it("Should allow owner to toggle whitelist sale", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.toggleWhiteListSale()).to.emit(energyVampires, "WhiteListSaleToggled").withArgs(true);
            expect(await energyVampires.whiteListSale()).to.equal(true);
            await expect(energyVampires.toggleWhiteListSale()).to.emit(energyVampires, "WhiteListSaleToggled").withArgs(false);
            expect(await energyVampires.whiteListSale()).to.equal(false);
        });

        it("Should prevent non-owners from toggling whitelist sale", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.connect(addr2).toggleWhiteListSale()).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Toggle PublicSale", function () {
        it("Should allow owner to toggle public sale", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.togglePublicSale()).to.emit(energyVampires, "PublicSaleToggled").withArgs(true);
            expect(await energyVampires.publicSale()).to.equal(true);
            await expect(energyVampires.togglePublicSale()).to.emit(energyVampires, "PublicSaleToggled").withArgs(false);
            expect(await energyVampires.publicSale()).to.equal(false);
        });

        it("Should prevent non-owners from toggling public sale", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.connect(addr2).togglePublicSale()).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Toggle Reveal", function () {
        it("Should allow owner to toggle reveal", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.toggleReveal()).to.emit(energyVampires, "RevealToggled").withArgs(true);
            expect(await energyVampires.isRevealed()).to.equal(true);
            await expect(energyVampires.toggleReveal()).to.emit(energyVampires, "RevealToggled").withArgs(false);
            expect(await energyVampires.isRevealed()).to.equal(false);
        });

        it("Should prevent non-owners from toggling reveal", async function () {
            const { energyVampires, owner, addr1, addr2 } = await loadFixture(setupContracts);

            await expect(energyVampires.connect(addr2).toggleReveal()).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
