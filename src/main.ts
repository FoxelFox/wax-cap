import axios from "axios";
import {Deal, Market, Order, Token} from "./interfaces";
import * as fs from "fs";
import {SetFormat, SheetsService} from "./sheets";
import {getMarketCapTable} from "./market-cap";
import {getBacklogTable} from "./backlog";

async function getMarkets(): Promise<Market[]> {
	console.log("Start Fetching Markets")
	const res = await axios.get(`https://wax.alcor.exchange/api/markets`);
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

	const stats = supply.data[token.symbol.name];
	token.supply = parseInt(stats.supply.split(" ")[0]);
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
		market.orders = await getOrders(market.id);
		await getSupply(market.quote_token);

		console.log(`Fetched ${market.orders.buy.length + market.orders.sell.length} orders from ${market.quote_token.symbol.name} / ${market.base_token.symbol.name}`)
	}

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
	const sheet = new SheetsService('1pj0JhhZDKtGFPI-ST8WsdNqnZ47vtVleHd1RBtrJGpE');

	await sheet.login();
	//await sheet.set('backlog!A1', getBacklogTable(JSON.parse(JSON.stringify(markets)), 'dknra.wam'), SetFormat.User);
	sheet.set('index!A3', getMarketCapTable(JSON.parse(JSON.stringify(markets))), SetFormat.User).then((o) => {
		console.log(o, "Updated Sheet");
	}).catch((e) => {
		console.log("Sheet update failed", e);
	});
}

function isCacheOutdated(): boolean {
	return Date.now() - new Date(fs.statSync("markets.json").mtime).getTime() > 1000 * 60 * 5
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
