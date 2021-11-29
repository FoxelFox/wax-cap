import {Market} from "./interfaces";

export function getMarketCapTable(markets: Market[]) {
	let waxMarkets = filterBy(markets, "WAX");
	let table: any[] = [];
	let i = 3;

	waxMarkets = waxMarkets.sort((a, b) => b.id - a.id);

	for (const m of waxMarkets) {
		const bid = getBid(m);
		const ask = getAsk(m);
		const spread = getSpread(bid, ask);


		if (bid > 0 && m.quote_token.supply! > 0) {
			const link = `HYPERLINK(https://wax.alcor.exchange/trade/${m.quote_token.symbol.name.toLowerCase()}-${m.quote_token.contract}_${m.base_token.symbol.name.toLowerCase()}-${m.base_token.contract}, ${m.quote_token.symbol.name})`
			table.push([link, `=C${i}*$B$2`, bid, m.quote_token.supply, m.quote_token.maxSupply, `=B${i}*D${i}`, `=B${i}*E${i}`, spread === Infinity ? '' : spread, m.volume24]);
			i++;
		}
	}

	return table;
}

function filterBy(markets: Market[], token: string): Market[] {
	const filtered = markets.filter(m => m.base_token.symbol.name === token);

	return filtered.filter(function(item, pos) {
		return filtered.indexOf(item) == pos;
	})
}

function getBid(market: Market): number {
	const bid = market.orders?.buy[0];
	return bid ? parseInt(bid.unit_price) / Math.pow(10, market.base_token.symbol.precision) : 0;
}

function getAsk(market: Market): number {
	const ask = market.orders?.sell[0];
	return ask ? parseInt(ask.unit_price) / Math.pow(10, market.base_token.symbol.precision) : Infinity;
}

function getSpread(bid: number, ask: number) {
	return (ask/bid) - 1;
}
