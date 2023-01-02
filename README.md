# EVM Nestable Demo

### A contextualized user journey to explore and understand the Nestable NFT features

Nestable is a Solidity smart contract implementation by [RMRK Team](https://github.com/rmrk-team) that allows NFTs to own other NFTs.
In this journey we will explore the main features of the [RMRK Nestable](https://github.com/rmrk-team/evm/blob/master/contracts/implementations/RMRKNestableImpl.sol).

##### The use cases that will be explored are:

- **Creation** of a multi-level NFTs hierarchy;
- **Transfer** of NFTs between hierarchy owners and/or hierarchy levels;
- **Burn** NFTs at different hierarchy levels.

## User journey context

To better understand the different use cases of this standard we will observe them in situations where the context is clear, because we are already familiar with them. Every action will be performed using smart contract functions with the help of some _Typescript_ code. :muscle:

_We are in the Medieval epoch and in the universe there is an omnipotent and all-powerful Wizard._
_During a special day, the wizard decided to create two kings, each one with their own Kingdom and then he allowed the kings to govern their kingdoms._
_Every action that unfolded later is included in the user journey. Have fun and happy learning!_

### The Kingdoms genesis - Multi-level hierarchy creation

The Wizard decided that the universe will be structured in this way:

- 2 Kingdoms; each with a single king
- 5 Armies: 3 for the first kingdom and 2 for the second one
- 90 Soldiers: distributed between the 5 armies, but not in equal parts.

The first action was to create the two kingdoms and give them to their owners. The Kingdom 1 to the **King One** (very original name :satisfied:) and the Kingdom 2 to the **King Two**.

```typescript
const FIRST_KINGDOM_ID = 1
const SECOND_KINGDOM_ID = 2

let firstKingdomCreationTx = await kingdomSCInstance.mint(KING_ONE.address, 1, {
  value: pricePerKingdom,
})
await firstKingdomCreationTx.wait()
let secondtKingdomCreationTx = await kingdomSCInstance.mint(
  KING_TWO.address, // receiver address
  1, // tokens to mint
  { value: pricePerKingdom } // total minting price
)
await secondtKingdomCreationTx.wait()
```

![alt text](images/Nestable_demo_hierarchy_creation.png)

After that, the Wizard decided to create the armies and did it by making them appear **directly** in their respective kingdoms.

```typescript
const FIRST_KINGDOM_ARMIES = 3
const SECOND_KINGDOM_ARMIES = 2

let firstArmyTx = await armySCInstance.nestMint(    // mint directly into parent NFT
  kingdomSCInstance.address,    // destination NFT contract address
  FIRST_KINGDOM_ARMIES,         // tokens to mint
  FIRST_KINGDOM_ID,             // parent token ID
  { value: pricePerArmy.mul(FIRST_KINGDOM_ARMIES) } // total minting price
)
await firstArmyTx.wait()
let secondArmyTx = await armySCInstance.nestMint(   // mint directly into parent NFT
  kingdomSCInstance.address,    // destination NFT contract address
  SECOND_KINGDOM_ARMIES,        // tokens to mint
  SECOND_KINGDOM_ID,            // parent token ID
  { value: pricePerArmy.mul(SECOND_KINGDOM_ARMIES) }    // total minting price
)
await secondArmyTx.wait()
```
![alt text](images/Nestable_demo_hierarchy_creation_2.png)

But the a gift can't be **granted** without **acceptance** of the receiver, so after the armies were distributed to their respective kingdoms, the kings controlling them accepted the armies and vowed to guide them with honor and respect.

```typescript
for (let i = FIRST_KINGDOM_ARMIES - 1; i >= 0; i--) {
  let tx = await kingdomSCInstance
    .connect(KING_ONE)          // Assure that King One is the transaction signer
    .acceptChild(               // Move child from pending array to active array
      FIRST_KINGDOM_ID,         // ID of the parent token that will receive the child
      i,                        // index of the child ing the pending children array
      armySCInstance.address,   // parent token smart contract address
      firstPendingArmies[i][0]  // child token ID
    )
  tx.wait()
}

for (let i = SECOND_KINGDOM_ARMIES - 1; i >= 0; i--) {
  let tx = await kingdomSCInstance
    .connect(KING_TWO)          // Assure that King Two is the transaction signer
    .acceptChild(               // Move child from pending array to active array
      SECOND_KINGDOM_ID,        // ID of the parent token that will receive the child
      i,                        // index of the child ing the pending children array
      armySCInstance.address,   // parent token smart contract address
      secondPendingArmies[i][0] // child token ID
    )
  tx.wait()
}
```
![alt text](images/Nestable_demo_hierarchy_creation_3.png)

Wait a moment... these armies are **empty**! The Wizard created them, but forgot to add the soldiers... :sweat_smile:
It is better to repair this problem a soon as possible and **fill** the armies!

```typescript
// Mint soldiers
await soldierSCInstance
  .connect(WIZARD)
  .mint(WIZARD.address,     // minter address
    MAX_SOLDIER_TOKENS,     // number of tokens to mint    
    { value: pricePerSoldier.mul(MAX_SOLDIER_TOKENS) }) // total minting price

const soldiersDistribution = [10, 20, 30, 14, 16]
var soldierIdToMint = 1
```
![alt text](images/Nestable_demo_hierarchy_creation_4.png)

```typescript
// Assign each soldier to his army
for (let i = 0; i < soldiersDistribution.length; i++) {
  const toMint = soldiersDistribution[i]
  const armyId = i + 1
  for (let j = 0; j < toMint; j++) {
    await soldierSCInstance
      .connect(WIZARD)
      .nestTransferFrom(        // transfer token (child) directly into a new parent
        WIZARD.address,         // child owner from which transfer the token
        armySCInstance.address, // parent smart contract address
        soldierIdToAdd,         // child token ID
        armyId,                 // parent token ID
        []                      // additional data for the transaction
      )
    soldierIdToAdd++
  }
}

// Accept the soldiers in the armies
for (let j = 0; j < armiesComposition.length; j++) {
  for (let i = soldiersDistribution[j] - 1; i >= 0; i--) {
    if (j < 3) {
      await armySCInstance
        .connect(KING_ONE)              // make King One the transaction signer 
        .acceptChild(                   // Move child from pending array to active array
          j + 1,                        // ID of the parent token that will receive the child
          i,                            // index of the child ing the pending children array
          soldierSCInstance.address,    // parent token smart contract address
          armiesComposition[j][i][0]    // child token ID
        )
    } else {
      await armySCInstance
        .connect(KING_TWO)              // make King Two the transaction signer 
        .acceptChild(                   // Move child from pending array to active array
          j + 1,                        // ID of the parent token that will receive the child
          i,                            // index of the child ing the pending children array
          soldierSCInstance.address,    // parent token smart contract address
          armiesComposition[j][i][0]    // child token ID
        )
    }
  }
}
```

![alt text](images/Nestable_demo_hierarchy_creation_5.png)

Finally each Kingdom is complete!
The Wizard can now relax and retire to a quiet place to think about the next game. :sunglasses:

## Armies balancing - Transfer NFTs inside and outside the hierarchy

The two Kingdoms have been created and populated, but the King One isn't happy. He noticed that he has 3 armies, but they are grossly _imbalanced_.
In particular he noticed that there is a big difference between the first and the third army (which contain 30 and 10 soldiers respecitely).

```typescript
const biggerArmyId = 3
const smallerArmyId = 1
const bigArmy = await armySCInstance.childrenOf(biggerArmyId)
console.log("Bigger army soldiers amount now: %d", bigArmy.length)
const smallerArmy = await armySCInstance.childrenOf(smallerArmyId)
console.log("Smaller army soldiers amount now: %d", smallerArmy.length)
```
![alt text](images/Nestable_demo_hierarchy_transfer_0.png)

So he decided to re-balance these armies a bit. He did so by removing 5 soldiers from the first one and assigning them soldiers to the third one.

```typescript
for (let i = 0; i < 5; i++) {
  let soldierToRemoveIndex = bigArmy.length - 1 - i // we procede from last one back to the first one
  let soldierToRemoveId = bigArmy[soldierToRemoveIndex][0]
  console.log(
    "Removing from %d army the soldier with ID %s...",
    biggerArmyId,       // ID of the parent token from which remove the child
    soldierToRemoveId   // Child token ID to remove
  )

  await armySCInstance
    .connect(KING_ONE)          // make King One the transaction signer 
    .transferChild(             // transfer child token away from its parent
      biggerArmyId,             // ID of the parent token that actually owns the child
      armySCInstance.address,   // parent token smart contract address
      smallerArmyId,            // parent token ID
      soldierToRemoveIndex,     // position of the child token in active children array
      soldierSCInstance.address,    // child token smart contract address
      soldierToRemoveId,        // ID of the child token to transfer
      false,                    // is child token in the pending children array
      []                        // additional transaction data
    )
}
```
![alt text](images/Nestable_demo_hierarchy_transfer_1.png)

Integrating a new team always has its difficulties, but after proving their worth, the new soldiers have been accepted and became part of the third army.

```typescript
for (let i = 0; i < 5; i++) {
  let soldierToAddIndex = pendingSoldiers.length - 1 - i // we procede from last one back to the first one
  let soldierToAddId = pendingSoldiers[soldierToAddIndex][0]
  await armySCInstance
    .connect(KING_ONE)              // make King One the transaction signer 
    .acceptChild(                   // Move child from pending array to active array
      smallerArmyId,                // ID of the parent token that will receive the child
      soldierToAddIndex,            // index of the child ing the pending children array
      soldierSCInstance.address,    // parent token smart contract address
      soldierToAddId                // child token ID
    )
}
```

![alt text](images/Nestable_demo_hierarchy_transfer_2.png)

Good job, now the armies look more balanced! :blush:

## The Black Death - Burn NFTs at different hierarchy levels

It has been a prosperous period since the two kings have been erected to govern their kingdoms, but as always, prosperity doesn't last forever.
It was the year 1346 when a soldier, that just came back from an exploration mission, had contracted a mysterious illness. :skull:
After seeing the state of the unlucky man the King One decided to **move it away** from the second army and take him to the palace in order to observe the illness and try to find a cure.

![alt text](images/Nestable_demo_hierarchy_burn_1.png)

```typescript
const secondArmyId = 2
let secondArmySoldiers = await armySCInstance.childrenOf(secondArmyId)
const secondArmyLastSoldierIndex = secondArmySoldiers.length - 1
let secondArmyLastSoldierId =
  secondArmySoldiers[secondArmySoldiers.length - 1][0]

await armySCInstance
  .connect(KING_ONE)                // make King One the transaction signer 
  .transferChild(                   // transfer child token away from its parent
    secondArmyId,                   // ID of the parent token that actually owns the child 
    KING_ONE.address,               // address of the future token (child) owner
    0,                              // 0 because the future owner will not be another NFT
    secondArmyLastSoldierIndex,     // index of the child token in the active children array
    soldierSCInstance.address,      // child token smart contract address
    secondArmyLastSoldierId,        // ID of the child token to transfer
    false,                          // is child token in the pending children array
    []                              // additional transaction data
  )
```
![alt text](images/Nestable_demo_hierarchy_burn_2.png)

Several days passed and the soldier's health didn't get any better and finally, after 2 weeks of suffering, the soldier died.
The King One immediately decided to burn the body to contain the infection...

```typescript
await soldierSCInstance
  .connect(KING_ONE)                            // make King One the transaction signer 
  ["burn(uint256)"](secondArmyLastSoldierId)    // ID of the token to burn 
```
![alt text](images/Nestable_demo_hierarchy_burn_3.png)

But this wasn't enough. The infection has already spread throughout the second army.
A decision had to be made.
The sad king decided to push the entire army away to an isolated place within the kingdom, including every object and thing related to it, and this was a wise choice.

```typescript
const secondArmyIndex = 1 // index of the second army in the children list of the first kingdom
await kingdomSCInstance
  .connect(KING_ONE)            // make King One the transaction signer 
  .transferChild(               // transfer child token away from its parent
    FIRST_KINGDOM_ID,           // ID of the parent token that actually owns the child 
    KING_ONE.address,           // address of the future token (child) owner
    0,                          // 0 because the future owner will not be another NFT
    secondArmyIndex,            // index of the child token in the active children array
    armySCInstance.address,     // child token smart contract address
    secondArmyId,               // ID of the child token to transfer
    false,                      // is child token in the pending children array
    []                          // additional transaction data
  )
```
![alt text](images/Nestable_demo_hierarchy_burn_4.png)

The entire army died inside a month and the King burned every man and object to prevent the plague to resurface and do more damage to the kingdom.

```typescript
secondArmySoldiers = await armySCInstance.childrenOf(secondArmyId)
// Burn recursively the army and its the children
await armySCInstance
  .connect(KING_ONE)                        // make King One the transaction signer 
  ["burn(uint256,uint256)"](secondArmyId,   // ID of the token to burn
   secondArmySoldiers.length)               // number of children to burn
```
![alt text](images/Nestable_demo_hierarchy_burn_5.png)

Sometimes doing the right this is not easy, but the King One was wise and he contained the infection, saving the rest of its kingdom.

## User journey summary

In this tutorial we have seen how to interact with the Nestable implementation in order to:

1. :point_right: **Create** multi-level hierarchies using the kingdoms and their composition;
2. :point_right: **Transfer** NFTs between different parts of the hierarchy and also how to remove them (soldiers movements between the first and the third army);
3. :point_right: **Burn** NFTs at the lowest level of a hierarchy (the first soldier affected by the Black Death) and entire sub-hierarchies (like the second army after the infection).

## Bugs, doubts and help :pray:

For clarifications, bug reporting or help needed please open a Github issue or write a message in the telegram:

- **Telegram**: https://t.me/rmrkimpl