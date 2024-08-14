//********************************************************************************************
//** Diamonds PRB based on this video: TBD                                                  **
//** Version: 0.3                                                                           ** 
//** Date: 10/08/2024                                                                       **
//** Authour: MrBtcGambler                                                                  **
//** Start Balance: 40 TRX                                                                  **
//** Recovery Pot: 800 TRX ** Important ** Set "recoverAmount": 800 in server_config.json   **
//** Bust Threshold: 11 TRX ** Important ** Set "recoverAmount": 800 in client_config.json  **
//**                                                                                        **
//** Details:                                                                               **
//** Experiment using qBot: https://qbot.gg/?r=mrbtcgambler                                 **
//** Progressive Recovery Betting is a new concept that is much safer than Martingale       **
//** It flat bets on the basebet until profit is <0 and then adds 20% to the next bet       **
//** Until in profit, it then goes back to flat betting at the base bet                     **
//********************************************************************************************


import { unlink, access, constants } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import StakeApi from "./StakeApi.mjs";

const clientConfig = JSON.parse(await readFile(new URL('../client_config.json', import.meta.url)));
const serverConfig = JSON.parse(await readFile(new URL('../server_config.json', import.meta.url)));
let config = {
    apiKey: process.env.CLIENT_API_KEY || clientConfig.apiKey,
    password: process.env.CLIENT_PASSWORD || clientConfig.password,
    bustthreshold: process.env.CLIENT_BUSTTHRESHOLD || clientConfig.bustThreshold,
    twoFaSecret: process.env.CLIENT_2FA_SECRET || clientConfig.twoFaSecret || null,
    currency: process.env.CLIENT_CURRENCY || clientConfig.currency,
    recoverAmount: process.env.SERVER_RECOVER_AMOUNT || serverConfig.recoverAmount,
    recoverThreshold: process.env.CLIENT_RECOVER_THRESHOLD || clientConfig.recoverThreshold,
    funds: null
};

const apiClient = new StakeApi(config.apiKey);
config.funds = await apiClient.getFunds(config.currency);

let balance = config.funds.available;

if (balance > config.recoverThreshold) {
    await apiClient.depositToVault(config.currency, balance - config.recoverThreshold);
}
let win = false,
    startBalance = balance,
    betDelay = 40, // delay in milliseconds
    currentStreak = 0,
    version = 0.3,
    profit = 0,
    vaulted = 0,
    wager = 0,
    bets = 0,
    stage = 1,
    baseBet = 0.0002,
    previousBet = baseBet,
    nextBet = baseBet,
    lastHourBets = [],
    paused = false,
    pauseLogged = false,
    vaultThreshold = 44,
    winCount = 0,
    recoveryMode = false,
    highestLosingStreak = 0;

await new Promise(r => setTimeout(r, 3000));    

async function doBet() {
    if (win) {
        winCount++;
    } 

    if (profit >= 0) {
        nextBet = baseBet;
        if (balance >= vaultThreshold && recoveryMode === false){
            await apiClient.depositToVault(config.currency, balance - startBalance);
        }
    } else {
        nextBet = (nextBet + (nextBet * 0.2)); // adds 20% until back in profit
    }
}

function resetStats() {
    profit = 0;
}

function getBetsPerHour() {
    const now = +new Date();
    lastHourBets = lastHourBets.filter((timestamp) => now - timestamp <= 60 * 60 * 1000);

    return lastHourBets.length;
}

// Delete old state file
const dicebotStateFilename = new URL('/mnt/ramdrive/dicebot_state.json', import.meta.url);
access(dicebotStateFilename, constants.F_OK, (error) => {
    if (!error) {
        unlink(dicebotStateFilename, (err) => {});
    }
});

async function writeStatsFile() {
    await writeFile(dicebotStateFilename, JSON.stringify({
        bets: bets,
        stage: stage,
        wager: wager,
        vaulted: vaulted,
        profit: profit,
        betSize: nextBet,
        currentStreak: currentStreak,
        highestLosingStreak: highestLosingStreak,
        betsPerHour: getBetsPerHour(),
        lastBet: (new Date()).toISOString(),
        wins: winCount,
        losses: (bets - winCount),
        version: version,
        paused: paused
    }));
}

let diamondsBet = null,
    newBalance = null,
    roundProfit = 0,
    pauseFileUrl = new URL('pause', import.meta.url);
while (true) {
    access(pauseFileUrl, constants.F_OK, (error) => {
        paused = !error;
    });

    if (paused) {
        if (!pauseLogged) {
            console.log('[INFO] Paused...');
            pauseLogged = true;
        }
        await writeStatsFile();
        await new Promise(r => setTimeout(r, 1000));
        continue;
    } else {
        pauseLogged = false; // Reset the flag when not paused
    }
    
    try {
        diamondsBet = await apiClient.diamondsBet(nextBet, config.currency).then(async (result) => {
            try {
                const data = JSON.parse(result);

                if (data.errors) {
                    console.error('[ERROR] DiamondsBet response: ', data);

                    config.funds = await apiClient.getFunds(config.currency);
                    balance = config.funds.available;

                    return null;
                }

                return data.data.diamondsBet;
            } catch (e) {
                console.error('[ERROR]', e, result);

                config.funds = await apiClient.getFunds(config.currency);
                balance = config.funds.available;

                return null;
            }
        }).catch(error => console.error(error));

        if (!diamondsBet || !diamondsBet.state) {
            console.log('[ERROR] Pausing for 5 seconds...', diamondsBet);
            await new Promise(r => setTimeout(r, 5000));

            continue;
        }

        wager += nextBet;
        bets++;
        lastHourBets.push(+new Date());
        newBalance = diamondsBet.user.balances.filter((balance) => balance.available.currency === config.currency)[0];
        config.funds = {
            available: newBalance.available.amount,
            vault: newBalance.vault.amount,
            currency: config.currency
        };
        balance = config.funds.available;

        // Check if the balance has fallen below the bust threshold
        if (balance < clientConfig.bustThreshold) {
            console.log('\x1b[31m%s\x1b[0m', `[WARNING] Balance below bust threshold (${clientConfig.bustThreshold}). Entering recovery mode.`);
            recoveryMode = true;
        }

        // Calculate profit in normal mode
        profit = (balance - startBalance);

        // Adjust profit for recovery mode
        if (recoveryMode) {
            profit = (balance - (startBalance + serverConfig.recoverAmount));
        }

        if(recoveryMode === true && balance > (startBalance + serverConfig.recoverAmount)){
            await apiClient.depositToVault(config.currency, balance - startBalance);
            recoveryMode = false;
        }

        if (diamondsBet.payoutMultiplier > 1){
            win = true;
        }else{
            win = false;
        }

        if (win) {
            roundProfit = diamondsBet.payout;

            if (currentStreak >= 0) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
        } else {
            if (currentStreak <= 0) {
                currentStreak--;
            } else {
                currentStreak = -1;
            }
        }

        console.log(
            win ? '\x1b[32m%s\x1b[0m' : '\x1b[37m%s\x1b[0m',
            [
                'Payout: ' + diamondsBet.payoutMultiplier,
                'Balance: ' + balance.toFixed(8) + ' ' + config.currency.toUpperCase(),
                'Wager: ' + wager.toFixed(8) + ' ' + config.currency.toUpperCase(),
                'Start Balance: ' + startBalance.toFixed(8),
                'Profit: ' + profit.toFixed(8) + ' ' + config.currency.toUpperCase(),
                'Bet size: ' + nextBet.toFixed(8) + ' ' + config.currency.toUpperCase(),
                'Current streak: ' + currentStreak,
                'Recovery Mode: ' + recoveryMode
            ].join(' | ')
        );

        await doBet();

        previousBet = nextBet;
        if (currentStreak < 0) {
            highestLosingStreak = Math.max(highestLosingStreak, Math.abs(currentStreak));
        }

        await writeStatsFile();
        await new Promise(r => setTimeout(r, betDelay));
    } catch (e) {
        console.error('[ERROR]', e);

        config.funds = await apiClient.getFunds(config.currency);
        balance = config.funds.available;
    }
}
