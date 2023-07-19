// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract EnergyVampires is ERC721A, Ownable {
    using Strings for uint256;

    // Events
    event Minted(address indexed minter, uint256 quantity);
    event WhitelistMinted(address indexed minter, uint256 quantity);
    event TeamMinted(address indexed minter, uint256 quantity);
    event RevealToggled(bool isRevealed);
    event PublicSaleToggled(bool publicSale);
    event WhiteListSaleToggled(bool whiteListSale);
    event PauseToggled(bool pause);

    uint256 public constant MAX_SUPPLY = 6665;
    uint256 public constant MAX_PUBLIC_MINT = 10;
    uint256 public constant MAX_WHITELIST_MINT = 3;
    uint256 public constant PUBLIC_SALE_PRICE = .099 ether;
    uint256 public constant WHITELIST_SALE_PRICE = .0799 ether;

    string private baseTokenUri;
    string public placeholderTokenUri;

    //deploy smart contract, toggle WL, toggle WL when done, toggle publicSale
    bool public isRevealed;
    bool public publicSale;
    bool public whiteListSale;
    bool public pause;
    bool public teamMinted;

    mapping(address => uint256) public totalPublicMint;
    mapping(address => uint256) public totalWhitelistMint;

    constructor() ERC721A("Energy Vampires", "ENVAMP") {}

    modifier callerIsUser() {
        require(
            tx.origin == msg.sender,
            "Energy Vampires :: Cannot be called by a contract"
        );
        _;
    }

    function mint(uint256 _quantity) external payable callerIsUser {
        require(publicSale, "Energy Vampires :: Not Yet Active.");
        require(
            (totalSupply() + _quantity) <= MAX_SUPPLY,
            "Energy Vampires :: Beyond Max Supply"
        );
        require(
            (totalPublicMint[msg.sender] + _quantity) <= MAX_PUBLIC_MINT,
            "Energy Vampires :: Already minted 3 times!"
        );
        require(
            msg.value >= (PUBLIC_SALE_PRICE * _quantity),
            "Energy Vampires :: Below "
        );

        totalPublicMint[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);

        emit Minted(msg.sender, _quantity);
    }

    function whitelistMint(
        uint256 _quantity,
        bytes32 hash,
        bytes memory signature
    ) external payable callerIsUser {
        require(whiteListSale, "Energy Vampires :: Minting is on Pause");
        require(
            (totalSupply() + _quantity) <= MAX_SUPPLY,
            "Energy Vampires :: Cannot mint beyond max supply"
        );
        require(
            (totalWhitelistMint[msg.sender] + _quantity) <= MAX_WHITELIST_MINT,
            "Energy Vampires :: Cannot mint beyond whitelist max mint!"
        );
        require(
            msg.value >= (WHITELIST_SALE_PRICE * _quantity),
            "Energy Vampires :: Payment is below the price"
        );
        require(
            recoverSigner(hash, signature) == owner(),
            "Energy Vampires :: Address is not allowlisted"
        );

        totalWhitelistMint[msg.sender] += _quantity;
        _safeMint(msg.sender, _quantity);

        emit WhitelistMinted(msg.sender, _quantity);
    }

    function recoverSigner(
        bytes32 hash,
        bytes memory signature
    ) public pure returns (address) {
        bytes32 messageDigest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        return ECDSA.recover(messageDigest, signature);
    }

    function teamMint() external onlyOwner {
        require(!teamMinted, "Energy Vampires :: Team already minted");
        teamMinted = true;
        _safeMint(msg.sender, 200);

        emit TeamMinted(msg.sender, 200);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenUri;
    }

    //return uri for certain token
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        uint256 trueId = tokenId + 1;

        if (!isRevealed) {
            return placeholderTokenUri;
        }
        //string memory baseURI = _baseURI();
        return
            bytes(baseTokenUri).length > 0
                ? string(
                    abi.encodePacked(baseTokenUri, trueId.toString(), ".json")
                )
                : "";
    }

    function setTokenUri(string memory _baseTokenUri) external onlyOwner {
        baseTokenUri = _baseTokenUri;
    }

    function setPlaceHolderUri(
        string memory _placeholderTokenUri
    ) external onlyOwner {
        placeholderTokenUri = _placeholderTokenUri;
    }

    function togglePause() external onlyOwner {
        pause = !pause;

        emit PauseToggled(pause);
    }

    function toggleWhiteListSale() external onlyOwner {
        whiteListSale = !whiteListSale;

        emit WhiteListSaleToggled(whiteListSale);
    }

    function togglePublicSale() external onlyOwner {
        publicSale = !publicSale;

        emit PublicSaleToggled(publicSale);
    }

    function toggleReveal() external onlyOwner {
        isRevealed = !isRevealed;

        emit RevealToggled(isRevealed);
    }
}
