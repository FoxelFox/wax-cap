export interface Symbol {
	name: string
	precision: number
}

export interface Token {
	contract: string,
	symbol: Symbol,
	str: string
}

export interface Market {
	id: number
	base_token: Token
	quote_token: Token
	min_buy: string // like '0.0001 AETHER'
	min_sell: string // like '0.0001 DUST'
	frozen: number
	fee: number
	last_price: number
	volume24: number
	volumeWeek: number
	volumeMonth: number
	change24: number // %
	changeWeek: number // %
	deals?: Deal[]
}

export interface Deal {
	_id: string,
	type: "sellmatch" | "buymatch"
	trx_id: string,
	unit_price: number,
	ask: number,
	bid: number
	time: string
}

const example = {
	id: 156,
	base_token: {
		contract: "eosio.token",
		symbol: {
			name: "WAX",
				precision: 8
		},
		str: "WAX@eosio.token"
	},
	quote_token: {
		contract: "farmingtoken",
		symbol: {
			name: "SEST",
			precision: 4
		},
		str: "SEST@farmingtoken"
	},
	min_buy: "0.00000001 WAX",
	min_sell: "0.0001 SEST",
	frozen: 0,
	fee: 0,
	last_price: 0.05,
	volume24: 2123.30961284,
	volumeWeek: 2123.30961284,
	volumeMonth: 2123.30961284,
	change24: 349.6402877697842,
	changeWeek: 349.6402877697842
}

