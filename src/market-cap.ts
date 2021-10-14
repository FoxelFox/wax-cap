import {Market} from "./interfaces";

export function getTable(markets: Market[]) {

}

function getMaxBid(market: Market): number {
	const buys = market.deals?.filter(d => d.type === "buymatch");

	if (buys) {
		buys.sort( (dealA, dealB) => dealA.bid - dealB.bid)
	}

	return 0;
}
