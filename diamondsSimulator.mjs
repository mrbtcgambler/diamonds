//https://www.youtube.com/watch?v=iFiabPUOQtw

import crypto from 'crypto';
const debugMode = false; // Set to true for detailed logging, false for simpler logs

//Game Play Variables, try new ideas
let noBets = 7200000, //240000 = 1 day, 1680000 = 1 week, 7200000 = 1 Month 86400000 = 1 year
    startBalance = 40040,
    baseBet = 0.0002,
    increaseOnLoss = 2.06, //for full recovery 105.3%
    vaultThreshold = 4, //set to vault every 4 profit
    debugDelay = 1000, //in milliseconds 1 second = 1000
//Sytem Variables - No need to modify
    balance = startBalance,
    vaultBalance = 0,
    nextBet = baseBet,
    previousBet = baseBet,
    totalBet = (nextBet),
    currentStreak = 0,
    highestLosingStreak = 0,
    winCount = 0,
    loseCount = 0,
    zeroMatch = 0,
    pair = 0,
    twoPairs = 0,
    threeOfKind = 0,
    fullHouse = 0,
    fourOfKind = 0,
    fiveOfKind = 0,
    lowestBalance = startBalance,
    largestBetPlaced = baseBet,
    profit = 0,
    wager = 0,
    win = false,
    tied = false,
    progress;

// Define the gems and their mappings
const GEMS = ['green', 'purple', 'yellow', 'red', 'cyan', 'pink', 'blue']; 
    
// Function to generate a float from a set of bytes
function bytesToFloat(bytes) {
    let [b1, b2, b3, b4] = bytes;
    return (
      (b1 / 256) +
      (b2 / Math.pow(256, 2)) +
      (b3 / Math.pow(256, 3)) +
      (b4 / Math.pow(256, 4))
    );
  }

  // Function to generate the gems for a given serverSeed, clientSeed, and nonce
function generateGems(serverSeed, clientSeed, nonce) {
    const rawFloats = getRawFloats(serverSeed, clientSeed, nonce);
    return rawFloats.map(float => GEMS[Math.floor(float * 7)]);
  }
    
// Function to get raw floats using HMAC_SHA256
function getRawFloats(serverSeed, clientSeed, nonce) {
    const hmac = crypto.createHmac('sha256', serverSeed);
    hmac.update(`${clientSeed}:${nonce}:0`);
    const buffer = hmac.digest();
    const rawFloats = [];
  
    // Extract five sets of four bytes
    for (let i = 0; i < 5; i++) {
      const bytes = buffer.slice(i * 4, (i + 1) * 4);
      const float = bytesToFloat(bytes);
      rawFloats.push(float);
    }
  
    return rawFloats;
  }
    
// Function to determine the payout based on the gems
function determinePayout(gems) {
    const gemCount = {};
    gems.forEach(gem => gemCount[gem] = (gemCount[gem] || 0) + 1);
  
    const counts = Object.values(gemCount).sort((a, b) => b - a);
  
    if (counts[0] === 5) {
        fiveOfKind ++;
        return 50; // Five of a kind
    } else if (counts[0] === 4) {
        fourOfKind ++;
        return 5; // Four of a kind
    } else if (counts[0] === 3 && counts[1] === 2) {
        fullHouse ++;
        return 4; // Full house
    } else if (counts[0] === 3) {
        threeOfKind ++;
        return 3; // Three of a kind
    } else if (counts[0] === 2 && counts[1] === 2) {
        twoPairs ++;
        return 2; // Two pairs
    } else if (counts[0] === 2) {
        pair ++;
        return 0.1; // One pair
    } else {
        zeroMatch ++;
        return 0; // No match
    }
  }
    
const serverSeed = generateRandomServerSeed(64);
const clientSeed = generateRandomClientSeed(10);
const startNonce = Math.floor(Math.random() * 1000000) + 1;
const startTime = Date.now();
let nonce = startNonce;
    
function generateRandomClientSeed(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
    
function generateRandomServerSeed(length) {
    let result = [];
    const hexRef = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    for (let n = 0; n < length; n++) {
        result.push(hexRef[Math.floor(Math.random() * 16)]);
    }
    return result.join('');
}

// Function to simulate one round of the Diamonds game
function playDiamondsRound(serverSeed, clientSeed, nonce) {
    const gems = generateGems(serverSeed, clientSeed, nonce);
    const payoutMultiplier = determinePayout(gems);
    return { gems, payoutMultiplier };
  }
  
    
function betDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}      

async function runBets() {
    let betCount = 0;
    while (betCount < noBets) {
        nonce++;
        progress = (betCount / noBets) * 100;
        let result = playDiamondsRound(serverSeed, clientSeed, nonce);
        let gems = generateGems(serverSeed, clientSeed, nonce);
        let payoutMultiplier = determinePayout(gems);
        wager += nextBet;
        profit -= nextBet;
        balance = (startBalance + profit);

    if (nextBet > balance) {
        const redText = '\x1b[31m'; // ANSI escape code for red text
        const resetText = '\x1b[0m'; // ANSI escape code to reset text color
        console.log(`${redText}BUST!${resetText}`);
        console.log('Server Seed:', serverSeed, 'Client Seed:', clientSeed, 'Nonce:', nonce);
        console.log(`${redText}##########################################${resetText}`);
        console.log(`${redText}# Bet Summary:${resetText}`);
        console.log(`${redText}# Total Bets: ${noBets}${resetText}`);
        console.log(`${redText}# Total Profits: ${profit.toFixed(4)}${resetText}`);
        console.log(`${redText}# Total Wager: ${wager.toFixed(4)}${resetText}`);
        console.log(`${redText}# Total Five of a kind (50x): ${fiveOfKind}${resetText}`);
        console.log(`${redText}# Total Four of a kind (5x): ${fourOfKind}${resetText}`);
        console.log(`${redText}# Total Full House (4x): ${fullHouse}${resetText}`);
        console.log(`${redText}# Total Three of a kind (3x): ${threeOfKind}${resetText}`);
        console.log(`${redText}# Total Two pair (2x): ${twoPairs}${resetText}`);
        console.log(`${redText}# Total pair (0.1x): ${pair}${resetText}`);
        console.log(`${redText}# Zero Match (0x): ${zeroMatch}${resetText}`);
        console.log(`${redText}# Largest Bet placed: ${largestBetPlaced.toFixed(4)}${resetText}`);
        console.log(`${redText}# Highest Losing Streak: ${highestLosingStreak}${resetText}`);
        console.log(`${redText}# Closing Server Seed: ${serverSeed}${resetText}`);
        console.log(`${redText}# Closing Client Seed: ${clientSeed}${resetText}`);
        console.log(`${redText}# Closing Nonce: ${nonce}${resetText}`);
        console.log(`${redText}# Current Balance : ${balance}${resetText}`);
        console.log(`${redText}# Next Bet: ${nextBet}${resetText}`);
        console.log(`${redText}##########################################${resetText}`);
        process.exit();
    }

    if (result.payoutMultiplier >= 1){
        win = true;
    }else{
        win = false;
    }

    if (balance < lowestBalance) {
      lowestBalance = balance;
    }

    if (nextBet > largestBetPlaced) {
      largestBetPlaced = totalBet;
    }

    if (debugMode) {
        console.log ('### Bet Number: ' +betCount);
        console.log ('Server Seed: ' + serverSeed, 'Client Seed: ' + clientSeed, 'Nonce: ' +nonce, 'Bet Count: ' + betCount, 'Wins: ' + winCount, 'Losses: ' + loseCount);
        console.log('Game Result: ' + result.gems);
        console.log('Payout: ' + result.payoutMultiplier);
        console.log(
        win ? '\x1b[32m%s\x1b[0m' : (tied ? '\x1b[33m%s\x1b[0m' : '\x1b[31m%s\x1b[0m'),
            [
            'Next Bet: ' + nextBet.toFixed(6),
            'Total Bet: ' + totalBet.toFixed(6),
            'Payout: ' + payoutMultiplier,
            'Round Profit' + (result.payoutMultiplier * nextBet),
            'Current Streak: ' + currentStreak,
            'Highest Losing Streak: ' + highestLosingStreak,
            'Balance: ' + balance.toFixed(6),
            'Profit: ' + profit.toFixed(6),
            'Wager: ' + wager.toFixed(4),
            ].join(' | ')
        );
        console.log (' ');
        await betDelay(debugDelay); // Delay between each round when in debug mode    
    } else {
      if (betCount % 100000 === 0) {
            const endTime = Date.now();
            const runTimeSeconds = (endTime - startTime) / 1000;
            const betsPerSecond = ((nonce - startNonce + 1) / runTimeSeconds).toLocaleString('en-US', { maximumFractionDigits: 2 });          
                console.log(
                    [
                    'Progress %: ' + progress.toFixed(2),
                    'Bet Count ' + betCount,
                    'Balance: ' + (balance + vaultBalance).toFixed(4),
                    'profit: ' + (profit + vaultBalance).toFixed(4),
                    'Total Wagered: ' + wager.toFixed(4),
                    'Worst Loss Streak: ' + highestLosingStreak,
                    'Highest Bet: ' + largestBetPlaced.toFixed(4),
                    'Bets per Second: ' + betsPerSecond,
                ].join(' | ')
                );
            console.log('Profit: ' + profit.toFixed(4));
            console.log('Balance: ' + balance.toFixed(4));
            console.log('Variance: ' + (balance - startBalance.toFixed(4)));
            console.log ('Vault Balance: ' + vaultBalance);
        }
    }

    if (result.payoutMultiplier > 0){
        profit += (nextBet * result.payoutMultiplier);
    }

    if (win){
        winCount++;
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        //previousBet =nextBet;
        //nextBet = baseBet;
     }else{
        loseCount++;
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
        if (currentStreak < highestLosingStreak) {
            highestLosingStreak = currentStreak;
        }
    }

    if (profit >= 0) {
        nextBet = baseBet;
        if (profit > vaultThreshold){
            vaultBalance += profit;
            profit = 0;
        }
    } else {
        nextBet = (nextBet + (nextBet * 0.2));
        if (nextBet > largestBetPlaced){
            largestBetPlaced = nextBet;
        }
    }

    betCount++;
  }

  // Display the summary log
  const greenText = '\x1b[32m'; // ANSI escape code for green text
  const resetText = '\x1b[0m'; // ANSI escape code to reset text color
  
  console.log(`${greenText}##########################################${resetText}`);
  console.log(`${greenText}# Bet Summary:${resetText}`);
  console.log(`${greenText}# Total Bets: ${noBets}${resetText}`);
  console.log(`${greenText}# Total Profits: ${(profit + vaultBalance).toFixed(4)}${resetText}`);
  console.log(`${greenText}# Total Wager: ${wager.toFixed(4)}${resetText}`);
  console.log(`${greenText}# Total Five of a kind (50x): ${fiveOfKind}${resetText}`);
  console.log(`${greenText}# Total Four of a kind (5x): ${fourOfKind}${resetText}`);
  console.log(`${greenText}# Total Full House (4x): ${fullHouse}${resetText}`);
  console.log(`${greenText}# Total Three of a kind (3x): ${threeOfKind}${resetText}`);
  console.log(`${greenText}# Total Two pair (2x): ${twoPairs}${resetText}`);
  console.log(`${greenText}# Total pair (0.1x): ${pair}${resetText}`);
  console.log(`${greenText}# Zero Match (0x): ${zeroMatch}${resetText}`);
  console.log(`${greenText}# Lowest Balance during play: ${lowestBalance.toFixed(4)}${resetText}`);
  console.log(`${greenText}# Largest Bet placed: ${largestBetPlaced.toFixed(4)}${resetText}`);
  console.log(`${greenText}# Highest Losing Streak: ${highestLosingStreak}${resetText}`);
  console.log(`${greenText}# Closing Server Seed: ${serverSeed}${resetText}`);
  console.log(`${greenText}# Closing Client Seed: ${clientSeed}${resetText}`);
  console.log(`${greenText}# Closing Nonce: ${nonce}${resetText}`);
  console.log(`${greenText}##########################################${resetText}`);
}

runBets();
