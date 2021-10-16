import axios from "axios";
import {Deal, Market} from "./interfaces";
import * as fs from "fs";
import {SetFormat, SheetsService} from "./sheets";

async function getMarkets(): Promise<Market[]> {
	const res = await axios.get(`https://wax.alcor.exchange/api/markets`);
	return res.data as Market[];
}

async function getDeals(id: number): Promise<Deal[]> {
	const res = await axios.get(`https://wax.alcor.exchange/api/markets/${id}/deals`);
	return res.data as Deal[];
}

async function getMarketDeals(): Promise<Market[]> {
	const markets = await getMarkets();

	for (const market of markets) {
		market.deals = await getDeals(market.id)
		console.log(`Fetched ${market.deals.length} deals from ${market.quote_token.symbol.name}/${market.base_token.symbol.name}`)
	}

	return markets;
}

async function main() {
	let markets;

	if (fs.existsSync("markets.json")) {
		markets = JSON.parse(fs.readFileSync("markets.json").toString());
	} else {
		markets = await getMarketDeals();
		fs.writeFileSync("markets.json", JSON.stringify(markets, undefined, '\t'))
	}

	const sheet = new SheetsService('1pj0JhhZDKtGFPI-ST8WsdNqnZ47vtVleHd1RBtrJGpE');

	await sheet.login();
	//const data = await sheet.get('index!I1:I', Format.Raw);
	const data = await sheet.set('index!I2', [[123]], SetFormat.Raw);
	console.log(data);
}


main().then(() => console.log("done"));
