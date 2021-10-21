const expect = require('chai').expect
const assert = require('chai').assert
const utils = require('./utils/test_utils')
const bsv = require('bsv')
require('dotenv').config()

const {
  contract,
  issue,
  transfer,
  split,
  merge,
  mergeSplit
} = require('../index')

const {
  getTransaction,
  getFundsFromFaucet,
  broadcast,
  SATS_PER_BITCOIN
} = require('../index').utils

let issuerPrivateKey
let fundingPrivateKey
let contractUtxos
let fundingUtxos
let publicKeyHash
let bobPrivateKey
let alicePrivateKey
let bobAddr
let aliceAddr
let splitTxid
let splitTx
let splitTxObj

it('Successful MergeSplit With Fees', async function () {
  await setup() // contract, issue, transfer then split

  const issueOutFundingVout = splitTx.vout.length - 1

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const mergeSplitTxid = await broadcast(mergeSplitHex)
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
  expect(await utils.areFeesProcessed(mergeSplitTxid, 2)).to.be.true
})

it('Successful MergeSplit No Fees', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    null,
    null
  )
  const mergeSplitTxid = await broadcast(mergeSplitHex)
  expect(await utils.getVoutAmount(mergeSplitTxid, 0)).to.equal(0.0000075)
  expect(await utils.getVoutAmount(mergeSplitTxid, 1)).to.equal(0.0000225)
  expect(await utils.areFeesProcessed(mergeSplitTxid, 2)).to.be.false
})


it('Incorrect Destination 1 Satoshi Amount', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    100,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Incorrect Destination 2 Satoshi Amount', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis

  const mergeSplitHex = mergeSplit(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    100,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Incorrect Owner Private Key Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()

  const mergeSplitHex = mergeSplit(
    incorrectPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Incorrect Payments Private Key Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()

  const mergeSplitHex = mergeSplit(
    issuerPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    incorrectPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Incorrect Contract Public Key Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()

  const mergeSplitHex = mergeSplit(
    issuerPrivateKey,
    incorrectPrivateKey.publicKey,
    utils.getMergeSplitUtxo(splitTxObj, splitTx),
    aliceAddr,
    aliceAmountSatoshis,
    bobAddr,
    bobAmountSatoshis,
    utils.getUtxo(splitTxid, splitTx, 2),
    fundingPrivateKey
  )
  try {
    await broadcast(mergeSplitHex)
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.response.data).to.contain('mandatory-script-verify-flag-failed (Script failed an OP_EQUALVERIFY operation)')
  }
})

it('Attempt to MergeSplit More Than Two Tokens Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()
  try {
    const mergeSplitHex = mergeSplit(
      incorrectPrivateKey,
      issuerPrivateKey.publicKey,
      [{
        tx: splitTxObj,
        scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
        vout: 0,
        amount: splitTx.vout[0].value
      },
      {
        tx: splitTxObj,
        scriptPubKey: splitTx.vout[1].scriptPubKey.hex,
        vout: 1,
        amount: splitTx.vout[1].value

      },
      {
        tx: splitTxObj,
        scriptPubKey: splitTx.vout[2].scriptPubKey.hex,
        vout: 2,
        amount: splitTx.vout[2].value

      }],
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Attempt to MergeSplit Less Than Two Tokens Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const incorrectPrivateKey = bsv.PrivateKey()
  try {
    const mergeSplitHex = mergeSplit(
      incorrectPrivateKey,
      issuerPrivateKey.publicKey,
      [{
        tx: splitTxObj,
        scriptPubKey: splitTx.vout[0].scriptPubKey.hex,
        vout: 0,
        amount: splitTx.vout[0].value
      }],
      aliceAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('This function can only merge exactly 2 STAS tokens')
  }
})

it('Invalid Address Destination Address 1 Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const invalidAddr = '1MSCReQT9E4GpxuK1K'

  try {
    const mergeSplitHex = mergeSplit(
      issuerPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      invalidAddr,
      aliceAmountSatoshis,
      bobAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

it('Invalid Address Destination Address 2 Throws Error', async function () {
  await setup() // contract, issue, transfer then split

  const aliceAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) / 2
  const bobAmountSatoshis = Math.floor(splitTx.vout[0].value * SATS_PER_BITCOIN) + Math.floor(splitTx.vout[1].value * SATS_PER_BITCOIN) - aliceAmountSatoshis
  const invalidAddr = '1MSCReQT9E4GpxuK1K'

  try {
    const mergeSplitHex = mergeSplit(
      issuerPrivateKey,
      issuerPrivateKey.publicKey,
      utils.getMergeSplitUtxo(splitTxObj, splitTx),
      aliceAddr,
      aliceAmountSatoshis,
      invalidAddr,
      bobAmountSatoshis,
      utils.getUtxo(splitTxid, splitTx, 2),
      fundingPrivateKey
    )
    assert(false)
    return
  } catch (e) {
    expect(e).to.be.instanceOf(Error)
    expect(e.message).to.eql('Invalid Address string provided')
  }
})

async function setup() {

  issuerPrivateKey = bsv.PrivateKey()
  fundingPrivateKey = bsv.PrivateKey()
  bobPrivateKey = bsv.PrivateKey()
  alicePrivateKey = bsv.PrivateKey()
  bobAddr = bobPrivateKey.toAddress(process.env.NETWORK).toString()
  aliceAddr = alicePrivateKey.toAddress(process.env.NETWORK).toString()
  contractUtxos = await getFundsFromFaucet(issuerPrivateKey.toAddress(process.env.NETWORK).toString())
  fundingUtxos = await getFundsFromFaucet(fundingPrivateKey.toAddress(process.env.NETWORK).toString())
  publicKeyHash = bsv.crypto.Hash.sha256ripemd160(issuerPrivateKey.publicKey.toBuffer()).toString('hex')
  const symbol = 'TAALT'
  const supply = 10000
  const schema = utils.schema(publicKeyHash, symbol, supply)

  const contractHex = contract(
    issuerPrivateKey,
    contractUtxos,
    fundingUtxos,
    fundingPrivateKey,
    schema,
    supply
  )
  const contractTxid = await broadcast(contractHex)
  const contractTx = await getTransaction(contractTxid)

  const issueHex = issue(
    issuerPrivateKey,
    utils.getIssueInfo(aliceAddr, 7000, bobAddr, 3000),
    utils.getUtxo(contractTxid, contractTx, 0),
    utils.getUtxo(contractTxid, contractTx, 1),
    fundingPrivateKey,
    true,
    2
  )
  const issueTxid = await broadcast(issueHex)
  const issueTx = await getTransaction(issueTxid)
  const issueOutFundingVout = issueTx.vout.length - 1

  const transferHex = transfer(
    bobPrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(issueTxid, issueTx, 1),
    aliceAddr,
    utils.getUtxo(issueTxid, issueTx, issueOutFundingVout),
    fundingPrivateKey
  )
  const transferTxid = await broadcast(transferHex)
  const transferTx = await getTransaction(transferTxid)

  const bobAmount1 = transferTx.vout[0].value / 2
  const bobAmount2 = transferTx.vout[0].value - bobAmount1
  const splitDestinations = []
  splitDestinations[0] = { address: bobAddr, amount: bobAmount1 }
  splitDestinations[1] = { address: bobAddr, amount: bobAmount2 }

  const splitHex = split(
    alicePrivateKey,
    issuerPrivateKey.publicKey,
    utils.getUtxo(transferTxid, transferTx, 0),
    splitDestinations,
    utils.getUtxo(transferTxid, transferTx, 1),
    fundingPrivateKey
  )
  splitTxid = await broadcast(splitHex)
  splitTx = await getTransaction(splitTxid)
  splitTxObj = new bsv.Transaction(splitHex)
}
