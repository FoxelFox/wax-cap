import axios from "axios";
import {Deal, Market, Order, Token} from "./interfaces";
import * as fs from "fs";
import {SetFormat, SheetsService} from "./sheets";
import {getMarketCapTable} from "./market-cap";
import {getBacklogTable} from "./backlog";

let waxToken: Token

async function getMarkets(): Promise<Market[]> {
	console.log("Start Fetching Markets")
	const res = await axios.get(`https://wax.alcor.exchange/api/markets`);
	console.log("jo")
	return res.data as Market[];
}

async function getOrders(id: number): Promise<{buy: Order[], sell: Order[]}> {

	const payload = {
		code: "alcordexmain",
		index_position: 2,
		json: true,
		key_type: "i128",
		limit: 1000,
		lower_bound: "",
		reverse: false,
		scope: id,
		show_payer: false,
		table: "buyorder",
		table_key: "",
		upper_bound: "",
	};

	const resBuy = await axios.get<{rows: Order[]}>(`https://wax.greymass.com/v1/chain/get_table_rows`, { data: payload});

	payload.table = "sellorder";

	const resSell = await axios.get<{rows: Order[]}>(`https://wax.greymass.com/v1/chain/get_table_rows`, { data: payload});


	return {
		buy: resBuy.data.rows,
		sell: resSell.data.rows
	}
}

async function getSupply(token: Token) {

	const supply = await axios.get<{rows: Order[]}>(`https://wax.greymass.com/v1/chain/get_currency_stats`, {
		data: {
			code: token.contract,
			symbol: token.symbol.name
		}
	});

	// eg ["fhfri.wam", "0.71939557"]
	const topHolders = await axios.get<any[]>(`https://www.api.bloks.io/wax/tokens?type=topHolders&chain=wax&contract=${token.contract}&symbol=${token.symbol.name}&limit=10`, {
		data: {
			type: "topHolders",
			chain: "wax",
			contract: token.contract,
			symbol: token.symbol.name,
			limit: 10
		}
	});

	const blacklist = [token.contract]
	let blacklistedSupply = 0;
	console.log("test")
	for (const holder of topHolders.data) {
		if (blacklist.indexOf(holder[0]) !== -1) {
			blacklistedSupply += parseFloat(holder[1])
		}
	}


	const stats = supply.data[token.symbol.name];
	token.supply = parseInt(stats.supply.split(" ")[0]) - blacklistedSupply;
	token.maxSupply = parseInt(stats.max_supply.split(" ")[0]);
	token.isuser = stats.isuser;
}

async function getDeals(id: number): Promise<Deal[]> {
	const res = await axios.get(`https://wax.alcor.exchange/api/markets/${id}/deals`);
	return res.data as Deal[];
}

async function getFullMarketInfo(): Promise<Market[]> {
	const markets = await getMarkets();

	for (const market of markets) {
		//market.deals = await getDeals(market.id);
		try {
			market.orders = await getOrders(market.id);
			await getSupply(market.quote_token);
			console.log(`Fetched ${market.orders.buy.length + market.orders.sell.length} orders from ${market.quote_token.symbol.name} / ${market.base_token.symbol.name}`)
		} catch (e) {
			markets.splice(markets.findIndex(m => m.id === market.id), 1);
		}
	}

	// find wax
	waxToken = markets.find(e => e.base_token.symbol.name === "WAX")!.base_token;
	await getSupply(waxToken);


	return markets;
}

async function main() {
	let markets;

	if (fs.existsSync("markets.json") && !isCacheOutdated()) {
		console.log("Using Cached Market Data")
		markets = JSON.parse(fs.readFileSync("markets.json").toString());
	} else {
		markets = await getFullMarketInfo();
		fs.writeFileSync("markets.json", JSON.stringify(markets, undefined, '\t'))
	}

	const waxPrice = await getWAXPrice();

	const sheet = new SheetsService('1pj0JhhZDKtGFPI-ST8WsdNqnZ47vtVleHd1RBtrJGpE');
	await sheet.login();


	// WAX PRICE
	sheet.set('index!B2', [[waxPrice]], SetFormat.User).then((o) => {
		console.log(o, "Updated WAX Price");
	}).catch((e) => {
		console.log("Sheet update failed", e);
	});

	// WAX SUPPLY
	sheet.set('index!D2', [[waxToken.supply]], SetFormat.User).then((o) => {
		console.log(o, "Updated WAX Supply");
	}).catch((e) => {
		console.log("Sheet update failed", e);
	});

	// TOKENS
	sheet.set('index!A3', getMarketCapTable(JSON.parse(JSON.stringify(markets))), SetFormat.User).then((o) => {
		console.log(o, "Updated Sheet");
	}).catch((e) => {
		console.log("Sheet update failed", e);
	});
}

function isCacheOutdated(): boolean {
	return Date.now() - new Date(fs.statSync("markets.json").mtime).getTime() > 1000 * 60 * 5
}

async function getWAXPrice(): Promise<number> {
	const res = await axios.get<{wax: {usd: number}}>(
		"https://api.coingecko.com/api/v3/simple/price?ids=wax&vs_currencies=usd"
	);
	return res.data.wax.usd;
}


let inProgress = false;
async function loop() {
	console.log("loop");
	try {
		if (!inProgress) {
			inProgress = true
			console.log(`Starting ${new Date().toISOString()}`)
			await main();
			console.log(`Done ${new Date().toISOString()}`)
			inProgress = false
		}
	} catch (e) {
		console.log("Error")
		console.log(e);
		inProgress = false;
	}

}

setInterval(loop, 1000 * 60 * 10)
loop();
