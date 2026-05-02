package com.swimpay.receiver.security

interface PayloadSigner {
    fun sign(fields: SignedReceiverPayloadFields): String
}
