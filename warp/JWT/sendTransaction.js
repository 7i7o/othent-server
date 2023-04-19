import { warp, configureWallet } from '../warp-configs.js'
import queryDB from '../../database/queryDB.js'
import jwt from 'jsonwebtoken';
import readContract from '../readContract.js';

export default async function sendTransaction(JWT) {
    let transaction_id = null;

    try {
        const contract_id = await queryDB(JWT);
        const wallet = await configureWallet()
        const contract = warp.contract(contract_id.contract_id).setEvaluationOptions({internalWrites: true}).connect(wallet.jwk)
        
        const decoded_JWT = jwt.decode(JWT)
        let tags = decoded_JWT.tags
        tags.push( {name: "Contract-App", value: "Othent.io"}, {name: "Function", value: "sendTransaction"} )
        const options = {tags};

        transaction_id = await contract.writeInteraction({
            function: 'sendTransaction',
            jwt: JWT,
            encryption_type: 'JWT'
        }, options)


        const { cachedValue } = await contract.readState();
        const { state, validity, errorMessages} = cachedValue

        console.log(state)
        console.log(validity)
        console.log(errorMessages)

        const transactionId = transaction_id.originalTxId

        if (Object.keys(errorMessages).length === 0) {
            return { success: true, transactionId }
        } else {
            return { success: false, transactionId, errors: errorMessages.transactionId  }
        }


    } catch(errors) {
        return { success: false, transactionId: transaction_id ? transaction_id.originalTxId : null, errors: errors }
    }
}
