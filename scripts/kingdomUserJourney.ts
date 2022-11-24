import { ethers } from "hardhat";
import { Kingdom } from "../typechain-types";
import { Army } from "../typechain-types";
import { Soldier } from "../typechain-types";
import { BattleField } from "../typechain-types";

async function main() {

    const totalSoldierTokens = 90;
    const totalArmyTokens = 5;
    const totalKingdomTokens = 2;

    const MAX_SOLDIER_TOKENS = totalSoldierTokens;
    const MAX_ARMY_TOKENS = MAX_SOLDIER_TOKENS + totalArmyTokens;
    const MAX_KINGDOM_TOKENS = MAX_ARMY_TOKENS + totalKingdomTokens;

    const pricePerKingdom = ethers.utils.parseEther("1");
    const pricePerArmy = ethers.utils.parseEther("0.1");
    const pricePerSoldier = ethers.utils.parseEther("0.05");

    const [owner, account2, account3] = await ethers.getSigners();

    // Aliasing address with name
    const WIZARD = owner;
    const KING_ONE = account2;
    const KING_TWO = account3;

    // Create Kingdom NFT smart contract
    const kingdomFactory = await ethers.getContractFactory("Kingdom");
    const kingdomSCInstance: Kingdom = await kingdomFactory.deploy(
        "Kingdom",
        "KND",
        MAX_KINGDOM_TOKENS,
        pricePerKingdom,
        "ipfs://collectionMetadata",
        "ipfs://tokenMetadata",
        await owner.getAddress(),
        750 // 7.5%
    );

    // Create Army NFT smart contract
    const armyFactory = await ethers.getContractFactory("Army");
    const armySCInstance: Army = await armyFactory.deploy(
        "Army",
        "ARY",
        MAX_ARMY_TOKENS,
        pricePerArmy,
        "ipfs://collectionMetadata",
        "ipfs://tokenMetadata",
        await WIZARD.getAddress(),
        500 // 5.0%
    );

    // Create Soldier NFT smart contract
    const soldierFactory = await ethers.getContractFactory("Soldier");
    const soldierSCInstance: Soldier = await soldierFactory.deploy(
        "Soldier",
        "SLD",
        MAX_SOLDIER_TOKENS,
        pricePerSoldier,
        "ipfs://collectionMetadata",
        "ipfs://tokenMetadata",
        await owner.getAddress(),
        1000 // 10.0%
    );

    // Deploy smart contracts
    console.log("Deploying smart contracts...");
    await soldierSCInstance.deployed();
    await armySCInstance.deployed();
    await kingdomSCInstance.deployed();
    console.log("Deployed!");

    // Minting Kingdom NFTs directly to kings addresses
    console.log("Minting Kingdom NFTs, 1 per king. They are the top level hierarchy tokens.");
    let firstKingdomCreationTx = await kingdomSCInstance.mint(KING_ONE.address, 1, { value: pricePerKingdom });
    await firstKingdomCreationTx.wait();
    console.log("King %s now has a Kingdom!", KING_ONE.address);
    let secondtKingdomCreationTx = await kingdomSCInstance.mint(KING_TWO.address, 1, { value: pricePerKingdom });
    await secondtKingdomCreationTx.wait();
    console.log("King %s now has a Kingdom!", KING_TWO.address);

    // Check total supply of Kingdom tokens
    console.log("In the world there are now %d kingdoms.\n", await kingdomSCInstance.totalSupply());

    // Calculate armies distribution
    console.log("Minting middle hierarchy NFTs");
    const FIRST_KINGDOM_ARMIES = 3;
    const SECOND_KINGDOM_ARMIES = 2;

    const FIRST_KINGDOM_ID = 1;
    const SECOND_KINGDOM_ID = 2;

    let firstArmyTx = await armySCInstance.nestMint(kingdomSCInstance.address, FIRST_KINGDOM_ARMIES, FIRST_KINGDOM_ID, {
        value: pricePerArmy.mul(FIRST_KINGDOM_ARMIES)
    });
    await firstArmyTx.wait();
    let secondArmyTx = await armySCInstance.nestMint(kingdomSCInstance.address, SECOND_KINGDOM_ARMIES, SECOND_KINGDOM_ID, {
        value: pricePerArmy.mul(SECOND_KINGDOM_ARMIES)
    });
    await secondArmyTx.wait();

    var firstPendingArmies = await kingdomSCInstance.pendingChildrenOf(FIRST_KINGDOM_ID);
    var secondPendingArmies = await kingdomSCInstance.pendingChildrenOf(SECOND_KINGDOM_ID);
    console.log("The first kingdom has assigned %d armies and the second one has assigned %s armies.",
        firstPendingArmies.length, secondPendingArmies.length);

    // Accepting armies from pending children
    for (let i = FIRST_KINGDOM_ARMIES - 1; i >= 0; i--) {
        let tx = await kingdomSCInstance.connect(KING_ONE).acceptChild(FIRST_KINGDOM_ID, i, armySCInstance.address, firstPendingArmies[i][0]);
        tx.wait();
    }
    console.log("The king %s of the first Kingdom has accepted %d armies!", KING_ONE.address, FIRST_KINGDOM_ARMIES);

    for (let i = SECOND_KINGDOM_ARMIES - 1; i >= 0; i--) {
        let tx = await kingdomSCInstance.connect(KING_TWO).acceptChild(SECOND_KINGDOM_ID, i, armySCInstance.address, secondPendingArmies[i][0]);
        tx.wait();
    }
    console.log("The king %s of the second Kingdom has accepted %d armies!", KING_TWO.address, SECOND_KINGDOM_ARMIES);

    // Mint soldiers
    await soldierSCInstance.connect(owner).mint(owner.address, totalSoldierTokens, { value: pricePerSoldier.mul(totalSoldierTokens) });

    // Distribution of soldiers between the 5 armies
    const soldiersDistribution = [10, 20, 30, 14, 16];
    var soldierIdToMint = 1;

    // Assign each soldier to his army
    for (let i = 0; i < soldiersDistribution.length; i++) {
        const toMint = soldiersDistribution[i];
        for (let j = 0; j < toMint; j++) {
            await soldierSCInstance.nestTransfer(armySCInstance.address, soldierIdToMint, i + 1);
            soldierIdToMint++;
        }
    }

    var armiesComposition = []
    for (let i = 1; i <= soldiersDistribution.length; i++) {
        armiesComposition.push(await armySCInstance.pendingChildrenOf(i));
    }
    console.log("The wizard suggests to do this amies composition: %d %d %d for the first Kingdom and %d %d for the second one.",
        armiesComposition[0].length,
        armiesComposition[1].length,
        armiesComposition[2].length,
        armiesComposition[3].length,
        armiesComposition[4].length);

    console.log("...\n...\n...\nThe kings, after a small meditation have accepted to form in this way their armies.");

    // Accept first army soldiers
    for (let j = 0; j < armiesComposition.length; j++) {
        for (let i = soldiersDistribution[j] - 1; i >= 0; i--) {
            //const position = i;
            //const tokenId = armiesComposition[j][i][0];
            //console.log("Position %d, tokenID %d", position, tokenId);
            if (j < 3) {
                await armySCInstance.connect(KING_ONE).acceptChild(j + 1, i, soldierSCInstance.address, armiesComposition[j][i][0]);
            } else {
                await armySCInstance.connect(KING_TWO).acceptChild(j + 1, i, soldierSCInstance.address, armiesComposition[j][i][0]);
            }
        }
        console.log("Army %d is ready!", j + 1);
    }

    // Check if every child has been added to an army
    armiesComposition = []
    for (let i = 0; i < soldiersDistribution.length; i++) {
        armiesComposition.push((await armySCInstance.childrenOf(i + 1)).length);
        console.log("The army %d has been composed by %d soldiers!", i + 1, armiesComposition[i]);
    }

    console.log("Now each king has his armies and every army has its soldiers.");

    console.log("We will now explore what the Second King owns and how its Kingdom is structured");
    // Checking second kingdom hierarchy
    let x = await kingdomSCInstance.connect(KING_TWO).ownerOf(SECOND_KINGDOM_ID);
    let ownerArmies = await kingdomSCInstance.childrenOf(SECOND_KINGDOM_ID);
    console.log("Second King address: %s", KING_TWO.address);
    console.log("The Kingdom with token ID %s is owned by %s (second King).", SECOND_KINGDOM_ID, x);
    console.log("The Kingdom with ID %d owns %d armies. Their (token) ID are %d and %d",
        SECOND_KINGDOM_ID, ownerArmies.length, ownerArmies[0][0], ownerArmies[1][0]);
    let army1Soldiers = await armySCInstance.childrenOf(ownerArmies[0][0]);
    let army2Soldiers = await armySCInstance.childrenOf(ownerArmies[1][0]);

    var soldierIDs = [];
    for (let i = 0; i < army1Soldiers.length; i++) {
        soldierIDs.push(army1Soldiers[i][0]);
    }
    console.log("The army with ID %d is composed by the soldiers with ID: %s", ownerArmies[0][0], soldierIDs);
    soldierIDs = [];    // Reset array content
    for (let i = 0; i < army2Soldiers.length; i++) {
        soldierIDs.push(army2Soldiers[i][0]);
    }
    console.log("The army with ID %d is composed by the soldiers with ID: %s", ownerArmies[1][0], soldierIDs);

    console.log("\nStarting from the top we have explored the hierarchy of the Second Kingdom where the root owner is %s", KING_TWO.address);

    // Hierarchies transfer 
    const biggerArmyId = 3;
    const smallerArmyId = 1;
    const bigArmy = await armySCInstance.childrenOf(biggerArmyId);
    console.log("Army soldiers now: %d", bigArmy.length);

    for (let i = 0; i < 5; i++) {
        let soldierToRemoveIndex = bigArmy.length - 1 - i;    // we procede from last one back to the first one
        let soldierToRemoveId = bigArmy[soldierToRemoveIndex][0];
        console.log("Removing from %d army the soldier with ID %s...", biggerArmyId, soldierToRemoveId);

        // Transfer NFT (unnest from bigger army + nesting into the smaller army)
        await armySCInstance.connect(KING_ONE).transferChild(biggerArmyId,
            armySCInstance.address,
            smallerArmyId,
            soldierToRemoveIndex,
            soldierSCInstance.address,
            soldierToRemoveId,
            false,
            []);
    }

    console.log("\nArmy soldiers after rebalancing: %d", (await armySCInstance.childrenOf(biggerArmyId)).length);

    const pendingSoldiers = await armySCInstance.pendingChildrenOf(smallerArmyId);
    console.log("%d soldiers are joining the %d army.", pendingSoldiers.length, smallerArmyId);
    // Complete the moving of 5 soldiers to the 3rd army (smaller army)
    for (let i = 0; i < 5; i++) {
        let soldierToAddIndex = pendingSoldiers.length - 1 - i;    // we procede from last one back to the first one
        let soldierToAddId = pendingSoldiers[soldierToAddIndex][0];
        await armySCInstance.connect(KING_ONE).acceptChild(smallerArmyId, soldierToAddIndex, soldierSCInstance.address, soldierToAddId);
    }
    console.log("Now that the balancing process is finished three armies are composed of these amounts of soldiers:");
    for (let i = 0; i < 3; i++) {
        console.log("Army %d: %d soldiers", i + 1, (await armySCInstance.childrenOf(i + 1)).length);
    }

    // Burn an Army
    const secondArmyId = 2;
    let secondArmySoldiers = await armySCInstance.childrenOf(secondArmyId);
    console.log("Army owner: %s, army direct owner: %s", await armySCInstance.ownerOf(secondArmyId), await armySCInstance.directOwnerOf(secondArmyId));

    // Burn last army's soldier
    const secondArmyLastSoldierIndex = secondArmySoldiers.length - 1;
    let secondArmyLastSoldierId = secondArmySoldiers[secondArmySoldiers.length - 1][0];
    console.log("\Last soldier id: %d\n", secondArmyLastSoldierId);

    // Transfer Soldier NFT (= unnest from army + transfer to king address)
    await armySCInstance.connect(KING_ONE).transferChild(secondArmyId,
        KING_ONE.address,
        0,
        secondArmyLastSoldierIndex,
        soldierSCInstance.address,
        secondArmyLastSoldierId,
        false,
        []);

    console.log(await soldierSCInstance.balanceOf(KING_ONE.address));
    await soldierSCInstance.connect(KING_ONE)["burn(uint256)"](secondArmyLastSoldierId);
    console.log(await soldierSCInstance.balanceOf(KING_ONE.address));

    // Transfer Army NFT (= unnest from kingdom + transfer to king address)
    const secondArmyIndex = 1;  // index of the second army in the children list of the first kingdom
    await kingdomSCInstance.connect(KING_ONE).transferChild(FIRST_KINGDOM_ID,
        KING_ONE.address,
        0,
        secondArmyIndex,
        armySCInstance.address,
        secondArmyId,
        false,
        []);

    console.log("Army of %s: %d", KING_ONE.address, await armySCInstance.balanceOf(KING_ONE.address));
    secondArmySoldiers = await armySCInstance.childrenOf(secondArmyId);
    // Burn army with children (Soldier NFTs)
    await armySCInstance.connect(KING_ONE)["burn(uint256,uint256)"](secondArmyId, secondArmySoldiers.length);
    console.log("Army of %s: %d", KING_ONE.address, await armySCInstance.balanceOf(KING_ONE.address));

    console.log("Smart contract addresses -->\n%s\n%s\n%s", kingdomSCInstance.address, armySCInstance.address, soldierSCInstance.address);


    // Function to explore a Kingdom hierarchy
    async function printKingdom(kingdomId: number): Promise<string> {

        const king = await kingdomSCInstance.ownerOf(kingdomId);
        const armies = await kingdomSCInstance.childrenOf(kingdomId);
        console.log("\nKingdom with NFT ID %d is owned by the King %s and it owns %d Army NFTs:\n", kingdomId, king, armies.length);
        for (let i = 0; i < armies.length; i++) {
            const currentArmyId = armies[i][0];
            const soldiers = await armySCInstance.childrenOf(currentArmyId);
            console.log("\   |----Army with NFT ID %d owns %d Soldier NFTs:\n", currentArmyId, soldiers.length);
            for (let j = 0; j < soldiers.length; j++) {
                const currentSoldierId = soldiers[j][0];
                console.log("\t\|----Soldier with NFT ID %d", currentSoldierId);
                if (j == soldiers.length - 1) {
                    console.log("");
                }
            }
        }
        return "";
    }

    // Pretty print of Kingdom with ID 1
    await printKingdom(1);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});