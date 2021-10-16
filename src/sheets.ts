import {google} from "googleapis";
import readline from "readline";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";
import {sheets_v4} from "googleapis/build/src/apis/sheets/v4";



const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';

export enum GetFormat {
	Formula = "FORMULA",
	Formatted = "FORMATTED_VALUE",
	Raw = "UNFORMATTED_VALUE"
}

export enum SetFormat {
	Raw = "RAW",
	User = "USER_ENTERED"
}

export class SheetsService {

	credentials = JSON.parse(fs.readFileSync("credentials.json", "utf-8"));
	oAuth2Client: OAuth2Client;
	sheets;

	constructor(public spreadSheetID: string) {
		const {client_secret, client_id, redirect_uris} = this.credentials.installed;
		this.oAuth2Client = new google.auth.OAuth2(
			client_id, client_secret, redirect_uris[0]
		);
	}

	async login(): Promise<void> {
		return new Promise(resolve => {
			// Check if we have previously stored a token.
			fs.readFile(TOKEN_PATH, "utf-8", async (err, token) => {

				if (err) {
					await this.getNewToken(this.oAuth2Client);
				} else {
					this.oAuth2Client.setCredentials(JSON.parse(token));
				}

				this.sheets = google.sheets({version: 'v4', auth: this.oAuth2Client});
				resolve();
			});
		})
	}

	async getNewToken(oAuth2Client) {
		return new Promise(resolve => {
			const authUrl = oAuth2Client.generateAuthUrl({
				access_type: 'offline',
				scope: SCOPES,
			});
			console.log('Authorize this app by visiting this url:', authUrl);
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});
			rl.question('Enter the code from that page here: ', (code) => {
				rl.close();
				oAuth2Client.getToken(code, (err, token) => {
					if (err) return console.error('Error while trying to retrieve access token', err);
					oAuth2Client.setCredentials(token);
					// Store the token to disk for later program executions
					fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
						if (err) return console.error(err);
						console.log('Token stored to', TOKEN_PATH);
					});
					resolve(oAuth2Client);
				});
			});
		});
	}

	async get(range, valueRenderOption?: GetFormat) {
		return new Promise<any>(resolve => {

			this.sheets.spreadsheets.values.get({
				spreadsheetId: this.spreadSheetID,
				valueRenderOption,
				range,
			}, (err, res) => {
				if (err) return console.log('The API returned an error: ' + err);
				resolve(res!.data.values);
			});
		});
	}

	async set(range, values, format: SetFormat) {
		return new Promise<any>(resolve => {
			this.sheets.spreadsheets.values.update({
				spreadsheetId: this.spreadSheetID,
				valueInputOption: format,
				range,
				resource: {
					values
				}
			})
		});
	}
}



