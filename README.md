# EVM Nestable Demo 
### A contextualized user journey to explore and understand the Nestable NFT features

Nestable is a Solidity smart contract implementation by [RMRK Team](https://github.com/rmrk-team) that allows an NFT to own another NFT.
In this journey we will explore the main features of the [Nestable RMRK](https://github.com/rmrk-team/evm/blob/master/contracts/implementations/RMRKNestableImpl.sol).

##### The use cases that will be explored are:
- **Creation** of a multi-level NFTs hierarchy;
- **Transfer** of NFTs between hierarchy ownere and/or hierarchy levels;
- **Burn** NFTs at different hierarchy levels.

## User journey context

To better understand the different use cases of this standard we will transform them in situation where the dynamics are clear because we are already familiar with them, but every action will be performed with smart contract functions with the help of some *Typescript* code :muscle:

*We are in the Medieval epoch and in the universe there is a Wizard who can do whatever he wants.*
*During a special day the wizard decided to give life to 2 kings, each one with his own Kingdom and then he allowed the kings to model their kingdoms.*
*What happened after is discoverable following the user journey, so have fun and happy learning!*

### The Kingdoms genesis - Multi-level hierarchy creation

The day 0 the Wizard decided that the universe will be structured in this way:

- 2 Kingdom, each one with 1 king
- 5 Armies: 3 for the first kingdom and 2 for the other one
- 90 Soldiers: distributed between the 5 armies, but not in equal parts.

The first move was so to create the 2 kingdoms and give them to their owners, the Kingdom 1 to the **King One** (very original name :satisfied:) and the Kingdom 2 to the **King Two**.

```typescript
    const FIRST_KINGDOM_ID = 1;
    const SECOND_KINGDOM_ID = 2;

    let firstKingdomCreationTx = await kingdomSCInstance.mint(KING_ONE.address, 1, { value: pricePerKingdom });
    await firstKingdomCreationTx.wait();
    let secondtKingdomCreationTx = await kingdomSCInstance.mint(KING_TWO.address, 1, { value: pricePerKingdom });
    await secondtKingdomCreationTx.wait();
 ```

After that the Wizard decided to create the armies and did it by making them appear **directly** in the respectively kingdoms.

```typescript
    const FIRST_KINGDOM_ARMIES = 3;
    const SECOND_KINGDOM_ARMIES = 2;

    let firstArmyTx = await armySCInstance.nestMint(kingdomSCInstance.address, FIRST_KINGDOM_ARMIES, FIRST_KINGDOM_ID, { value: pricePerArmy.mul(FIRST_KINGDOM_ARMIES) });
    await firstArmyTx.wait();
    let secondArmyTx = await armySCInstance.nestMint(kingdomSCInstance.address, SECOND_KINGDOM_ARMIES, SECOND_KINGDOM_ID, { value: pricePerArmy.mul(SECOND_KINGDOM_ARMIES) });
    await secondArmyTx.wait();
```
But the a gift can't be **accept** without the permission of the receiver so after that the armies were distributed the kings controlled them and accepted to guide the armies with honor and respect.

```typescript
    for (let i = FIRST_KINGDOM_ARMIES - 1; i >= 0; i--) {
        let tx = await kingdomSCInstance.connect(KING_ONE).acceptChild(FIRST_KINGDOM_ID, i, armySCInstance.address, firstPendingArmies[i][0]);
        tx.wait();
    }
    for (let i = SECOND_KINGDOM_ARMIES - 1; i >= 0; i--) {
        let tx = await kingdomSCInstance.connect(KING_TWO).acceptChild(SECOND_KINGDOM_ID, i, armySCInstance.address, secondPendingArmies[i][0]);
        tx.wait();
    }
```

Wait a moment... these armies are **empty**! The Wizard created them but he forgot to add the soldiers... :sweat_smile:
It is better to repair to this problem a soon as possible and then **fill** the armies!

```typescript
    // Mint soldiers
    await soldierSCInstance.connect(WIZARD).mint(WIZARD.address, MAX_SOLDIER_TOKENS, { value: pricePerSoldier.mul(MAX_SOLDIER_TOKENS) });

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

    // Accept the soldiers in the armies
    for (let j = 0; j < armiesComposition.length; j++) {
        for (let i = soldiersDistribution[j] - 1; i >= 0; i--) {
            if (j < 3) {
                await armySCInstance.connect(KING_ONE).acceptChild(j + 1, i, soldierSCInstance.address, armiesComposition[j][i][0]);
            } else {
                await armySCInstance.connect(KING_TWO).acceptChild(j + 1, i, soldierSCInstance.address, armiesComposition[j][i][0]);
            }
        }
    }
```

Finally each Kingdom is complete!
The Wizard can now relax and retire in some quite place to think about the next game :sunglasses:


### Armies balancing - Transfer NFTs inside and outside the hierarchy

The 2 Kingdoms have been created and set up, but the King One isn't happy. He noticed that he has 3 armies, but very *unbalanced*.
In particular he noticed that there is a big difference between the first and the third army (with respectively 30 and 10 soldiers each).

```typescript
    const biggerArmyId = 3;
    const smallerArmyId = 1;
    const bigArmy = await armySCInstance.childrenOf(biggerArmyId);
    console.log("Bigger army soldiers amount now: %d", bigArmy.length);
    const smallerArmy = await armySCInstance.childrenOf(smallerArmyId);
    console.log("Smaller army soldiers amount now: %d", smallerArmy.length);
```

So he decided to re-balance a little the 2 armies by removing 5 soldiers from the first one and assigning these soldiers to the third.

```typescript
    for (let i = 0; i < 5; i++) {
        let soldierToRemoveIndex = bigArmy.length - 1 - i;    // we procede from last one back to the first one
        let soldierToRemoveId = bigArmy[soldierToRemoveIndex][0];
        console.log("Removing from %d army the soldier with ID %s...", biggerArmyId, soldierToRemoveId);

        await armySCInstance.connect(KING_ONE).transferChild(
            biggerArmyId, 
            armySCInstance.address, 
            smallerArmyId,
            soldierToRemoveIndex,
            soldierSCInstance.address,
            soldierToRemoveId,
            false,
            []);
    }
```

Integrate in a new team has always some difficulty, but after proving their value the new soldiers have been accepted and they became part of the group, the third army.

```typescript
    for (let i = 0; i < 5; i++) {
        let soldierToAddIndex = pendingSoldiers.length - 1 - i;    // we procede from last one back to the first one
        let soldierToAddId = pendingSoldiers[soldierToAddIndex][0];
        await armySCInstance.connect(KING_ONE).acceptChild(smallerArmyId, soldierToAddIndex, soldierSCInstance.address, soldierToAddId);
    }
```

Good job, now the armies looks more balanced! :blush:

### The Black Death - Burn NFTs at different hierarchy levels

It has been a florid period since the 2 kings have put to govern their kingdoms, but as we already know nothig goes right forever.
It was the year 1346 when a soldier, just came back from an exploration mission, died becasue of the bubonic plague :skull:
After seeing the body of the unlucky man (still alive) the King One decided to **move it away** from the second army and take him to the palace in order to observe the problem closer and try to find a solution.

```typescript
    const secondArmyId = 2;
    let secondArmySoldiers = await armySCInstance.childrenOf(secondArmyId);
    const secondArmyLastSoldierIndex = secondArmySoldiers.length - 1;
    let secondArmyLastSoldierId = secondArmySoldiers[secondArmySoldiers.length - 1][0];

    await armySCInstance.connect(KING_ONE).transferChild(secondArmyId,
        KING_ONE.address,
        0,
        secondArmyLastSoldierIndex,
        soldierSCInstance.address,
        secondArmyLastSoldierId,
        false,
        []);
```

Several days passed and the situation didn't get better and finally, after 2 weeks of pain, the soldier died.
The King One immediately decided to burn the body to limit the infection...

```typescript
    await soldierSCInstance.connect(KING_ONE)["burn(uint256)"](secondArmyLastSoldierId);
```

But this wasn't enough. The infection has already spreaded inside the second army involving.
A decision needs to be taken.
The sad king decided to push the entire army away in an isolated place inside the kingdom, with every object and thing related to it, and this was a wise choice.

```typescript
const secondArmyIndex = 1;  // index of the second army in the children list of the first kingdom
    await kingdomSCInstance.connect(KING_ONE).transferChild(FIRST_KINGDOM_ID,
        KING_ONE.address,
        0,
        secondArmyIndex,
        armySCInstance.address,
        secondArmyId,
        false,
        []);
 ```

The entire army died after a month and the King burned every man and object to prevent the plague to come back again and do other damages to the kingdom.

```typescript
    secondArmySoldiers = await armySCInstance.childrenOf(secondArmyId);
    // Burn recursively the army and its the children
    await armySCInstance.connect(KING_ONE)["burn(uint256,uint256)"](secondArmyId, secondArmySoldiers.length);
```

Sometimes do the right this is not easy, but the King One was wise and he contained the infection saving the rest of its kingdom.

### User journey summary

In this tutorial we have seen how to interact with the Nestable implementation in order to:
1. :point_right: **Create** multi-level hierarchies with the kingdoms and their composition;
2. :point_right: **Transfer** NFTs between different parts of the hierarchy and also how to remove them (soldiers movements between the first and the third army);
3. :point_right: **Burn** NFTs at the lowest level of a hierarchy (the first soldier affected by the Black Death) and entire sub-hierarchies (like the second army after the infection).

### Bugs, doubts and help :pray:

For clarifications, bug reporting or help needed please refer to one of these channels: 
- **Mail**: dev.andreavendrame@gmail.com 
- **Discord**: superrisk#5988
- **Twitter**: @vendrame_and
- **Github**: dev-andreavendrame

