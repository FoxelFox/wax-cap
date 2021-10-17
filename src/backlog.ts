import {Market} from "./interfaces";

export function getBacklogTable(markets: Market[], account: string) {

	const table: any = [['Market', 'Buy', 'Sell']];
	for (const market of markets) {
		const indexBuy = market.orders!.buy.findIndex(o => o.account === account)
		const indexSell = market.orders!.sell.findIndex(o => o.account === account)

		if (indexBuy >= 0 || indexSell >= 0) {
			table.push([
				`${market.quote_token.symbol.name} / ${market.base_token.symbol.name}`,
				indexBuy,
				indexSell
			])
		}
	}

	return table;
}
