import { warp, configureWallet } from '../warp-configs.js'
import queryDB from '../../EXM/queryDB.js'


export default async function initializeJWK(PEM_key_JWT) {

    const contract_id = await queryDB(PEM_key_JWT);

    const wallet = await configureWallet()
    const contract = warp.contract(contract_id.wallet_contract).setEvaluationOptions({internalWrites: true}).connect(wallet.jwk)
    const options = {tags: [
        {name: "Contract-App", value: "Othent.io"}, 
        {name: "Function", value: "initializeJWK"}
    ]};

    const transaction_id = await contract.writeInteraction({
        function: 'initializeJWK',
        jwt: PEM_key_JWT,
        encryption_type: 'JWK'
    }, options)

    return transaction_id
}

