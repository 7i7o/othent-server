import { warp, configureWallet } from '../warp-configs.js'
import updateDB from '../../database/updateDB.js'
import queryDB from '../../database/queryDB.js'
import jwt from 'jsonwebtoken';
import sendEmail from '../../new_user_email/email.js'
import axios from 'axios'

// return contract ID as well as the user details like how we do on login

export default async function createUser(JWT) { 

    const checkDB = await queryDB(JWT)

    if (checkDB.response === 'user not found') {

        const wallet = await configureWallet()
        const contract_state = { 
            App: "Othent.io", 
            Description: "Merging Web2 to Web3 user logins with a familiar and simple interface",
            user_id: null, 
            contract_address: null,
            last_nonce: null,
            JWK_public_key: null
        }
        let contract_code = await fetch('https://othent.io/contract.js')
        contract_code = await contract_code.text();


        const createOptions = {tags: [
            {name: "Contract-App", value: "Othent.io"}, 
            {name: "Contract-Description", value: "Othent.io merges Web2 to Web3 user logins with a familiar and simple interface"}, 
        ]};
        let tags = createOptions.tags
        const { contractTxId } = await warp.deploy({
            wallet: wallet, 
            initState: JSON.stringify(contract_state), 
            src: contract_code,
            tags
        });

        const contract = warp.contract(contractTxId).connect(wallet.jwk).setEvaluationOptions({internalWrites: true})

        const writeOptions = {tags: [
            {name: "Contract-App", value: "Othent.io"}, 
            {name: "Function", value: "initializeContract"}
        ]};

        await contract.writeInteraction({
            function: 'initializeContract',
            jwt: JWT,
            contract_address: contractTxId,
            encryption_type: "JWT"
        }, writeOptions)
    


        const decoded_JWT = jwt.decode(JWT)
        await updateDB(decoded_JWT.sub, contractTxId)


        const auth0Domain = process.env.auth0Domain;
        const auth0ClientId = process.env.auth0ClientId;
        const auth0ClientSecret = process.env.auth0ClientSecret;
        const audience = `https://${auth0Domain}/api/v2/`;
        const tokenUrl = `https://${auth0Domain}/oauth/token`;
        const tokenParams = {
        grant_type: 'client_credentials',
        client_id: auth0ClientId,
        client_secret: auth0ClientSecret,
        audience: audience
        };

        fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenParams)
        })
        .then(response => response.json())
        .then(tokenResponse => {
            const token = tokenResponse.access_token;

            const options = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
            };

            fetch(`https://othent.us.auth0.com/api/v2/users/${decoded_JWT.sub}`, options)
            .then(response => response.json())
            .then(user_data => {
                sendEmail(user_data.email, contractTxId);
                const user_data_res = {
                email: user_data.email,
                email_verified: user_data.email_verified,
                family_name: user_data.family_name,
                given_name: user_data.given_name,
                locale: user_data.locale,
                name: user_data.name,
                nickname: user_data.nickname,
                picture: user_data.picture,
                user_id: user_data.user_id,
                contract_id: contractTxId
                };
                console.log(user_data_res);
            })
            .catch(error => {
                console.error(error);
            });
        })
        .catch(error => {
            console.error(error);
        });







    }

    else {
        return checkDB.contract_id
    }
    
}



