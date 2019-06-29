/** 
* This contract tests the Tellor functions
*/ 

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const BN = require('bn.js');
const helper = require("./helpers/test_helpers");
//const ethers = require('ethers');
const TellorMaster = artifacts.require("./TellorMaster.sol");
const TellorGetters = artifacts.require("./TellorGetters.sol");
const TellorGettersLibrary = artifacts.require(".libraries/TellorGettersLibrary.sol");
const TellorLibrary = artifacts.require(".libraries/TellorLibrary.sol");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
var oracleAbi = Tellor.abi;
var masterAbi = TellorMaster.abi;
var oracleByte = Tellor.bytecode;

var api = 'json(https://api.gdax.com/products/BTC-USD/ticker).price';
var api2 = 'json(https://api.gdax.com/products/ETH-USD/ticker).price';

function promisifyLogWatch(_contract,_event) {
  return new Promise((resolve, reject) => {
    web3.eth.subscribe('logs', {
      address: _contract.options.address,
      topics:  ['0xba11e319aee26e7bbac889432515ba301ec8f6d27bf6b94829c21a65c5f6ff25']
    }, (error, result) => {
        if (error){
          console.log('Error',error);
          reject(error);
        }
        web3.eth.clearSubscriptions();
        //console.log(result);
        resolve(result);
    })
  });
}

contract('Further Tests', function(accounts) {
  let oracle;
  let oracle2;
  let oracleBase;
  let logNewValueWatcher;
  let master;

    beforeEach('Setup contract for each test', async function () {
        oracleBase = await Tellor.new();
        oracle = await TellorMaster.new(oracleBase.address);
        master = await new web3.eth.Contract(masterAbi,oracle.address);
        oracle2 = await new web3.eth.Contract(oracleAbi,oracleBase.address);///will this instance work for logWatch? hopefully...
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.init().encodeABI()})
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,0).encodeABI()})
        await helper.advanceTime(86400 * 8);
        await web3.eth.sendTransaction({to:oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestStakingWithdraw().encodeABI()})
        await helper.advanceTime(86400 * 8);
        await web3.eth.sendTransaction({to:oracle.address,from:accounts[2],data:oracle2.methods.withdrawStake().encodeABI()})
   });  
   it("transferOwnership", async function () {
        let checkowner = await oracle.getAddressVars(web3.utils.keccak256("_owner"));
        assert(checkowner == accounts[0], "initial owner acct 0");
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.transferOwnership(accounts[2]).encodeABI()});
        checkowner = await oracle.getAddressVars(web3.utils.keccak256("_owner"));
        assert(checkowner == accounts[2], "initial owner acct 2");
   });
   it("Request data", async function () {
        let res2 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,20).encodeABI()})
        let res = await web3.eth.abi.decodeParameters(['string','string','uint256','uint256'],res2.logs[2].data);
        let resSapi = res['0']
        let resApiId = await web3.eth.abi.decodeParameter('uint256',res2.logs[2].topics[2])
        apiVars = await oracle.getRequestVars(resApiId);
        assert( apiVars[5] == 20, "value pool should be 20");
        res3 = await web3.eth.abi.decodeParameters(['string','bytes32','uint256'],res2.logs[1].data);
        let apiIdonQ = await web3.eth.abi.decodeParameter('uint256',res2.logs[1].topics[1])
        let apiOnQPayout = res3['2'];
        assert(resSapi == api2,"string should be correct");
        assert(web3.utils.hexToNumberString(apiOnQPayout) == 20, "Current payout on Q should be 20");
        assert(web3.utils.hexToNumberString(apiIdonQ) == resApiId, "timestamp on Q should be apiID");
        vars = await oracle.getRequestVars(2);
        assert(vars[1] == "ETH/USD")
    });
    it("several request data", async function () {
        test1 = "https://api.gdax.com/products/ETH-USD/ticker";
        test2 = "https://api.gdax.com/products/BTC-USD/ticker";
        let req1 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(test1,"ETH/USD",1000,20).encodeABI()})
        onQ = await web3.eth.abi.decodeParameter('uint256',req1.logs[1].topics[1])
        assert(web3.utils.hexToNumberString(onQ) == 2, "should be 2");
       req1 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,40).encodeABI()})
        onQ = await web3.eth.abi.decodeParameter('uint256',req1.logs[1].topics[1])
       assert(web3.utils.hexToNumberString(onQ) == 3, "should be 3");
       req1 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(test1,"ETH/USD",1000,31).encodeABI()})
        onQ = await web3.eth.abi.decodeParameter('uint256',req1.logs[1].topics[1])
       assert(web3.utils.hexToNumberString(onQ) == 2, "should be 2");
       req1 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(test2,"ETH/USD",1000,60).encodeABI()})
        onQ = await web3.eth.abi.decodeParameter('uint256',req1.logs[1].topics[1])
       assert(web3.utils.hexToNumberString(onQ) == 4, "should be 4");
    });
    it("Request data and change on queue with another request", async function () {
        balance1 = await (oracle.balanceOf(accounts[2],{from:accounts[1]}));
        test1 = 'test';
        let pay = web3.utils.toWei('20', 'ether');
        let pay2 = web3.utils.toWei('50', 'ether');
        let res3 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(test1,"ETH/USD",1000,pay).encodeABI()})
        let res = await web3.eth.abi.decodeParameters(['string','string','uint256','uint256'],res3.logs[2].data);
        let resSapi = res['0']

        let resApiId = await web3.eth.abi.decodeParameter('uint256',res3.logs[2].topics[2])
        apiVars = await oracle.getRequestVars(resApiId)
        assert( apiVars[5] == pay, "value pool should be 20");
        let res2 = await web3.eth.abi.decodeParameters(['string','bytes32','uint256'],res3.logs[1].data);
        let apiIdonQ = await web3.eth.abi.decodeParameter('uint256',res3.logs[1].topics[1])
        let apiOnQPayout = res2['2'];
        assert(web3.utils.fromWei(apiOnQPayout) == 20, "Current payout on Q should be 20");
        assert(apiIdonQ== resApiId, "timestamp1 on Q should be apiID");
        res3 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,pay2).encodeABI()})
        res = await web3.eth.abi.decodeParameters(['string','string','uint256','uint256'],res3.logs[2].data);
        let resSapi2 = res['0']
        let resApiId2 = await web3.eth.abi.decodeParameter('uint256',res3.logs[2].topics[2])
        res2 = await web3.eth.abi.decodeParameters(['string','bytes32','uint256'],res3.logs[1].data);
        let apiIdonQ2 = await web3.eth.abi.decodeParameter('uint256',res3.logs[1].topics[1])
        let apiOnQPayout2 = res2['2'];
        assert(web3.utils.fromWei(apiOnQPayout2) == 50, "2Current payout on Q should be 50");
        assert(apiIdonQ2 == resApiId2, "2timestamp on Q should be apiTimestamp");
        balance2 = await (oracle.balanceOf(accounts[2],{from:accounts[1]}));
        assert(web3.utils.fromWei(balance1) - web3.utils.fromWei(balance2) == 70, "balance should be down by 70");
    });

  it("Test Add Value to Pool and change on queue", async function () {
        balance1 = await (oracle.balanceOf(accounts[2],{from:accounts[1]}));
        test1 = 'test';
        let pay = web3.utils.toWei('20', 'ether');
        let pay2 = web3.utils.toWei('30', 'ether');
        let res3 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(test1,"ETH/USD",1000,pay).encodeABI()})
        let res = await web3.eth.abi.decodeParameters(['string','string','uint256','uint256'],res3.logs[2].data);
        let resSapi = res['0']
        let resApiId = await web3.eth.abi.decodeParameter('uint256',res3.logs[2].topics[2])
        apiVars = await oracle.getRequestVars(resApiId)
        assert( apiVars[5] == pay, "value pool should be 20");
        let res2 = await web3.eth.abi.decodeParameters(['string','bytes32','uint256'],res3.logs[1].data);
        let apiIdonQ = await web3.eth.abi.decodeParameter('uint256',res3.logs[1].topics[1])
        let apiOnQPayout = res2['2'];
        assert(web3.utils.fromWei(apiOnQPayout) == 20, "Current payout on Q should be 20");
        assert(apiIdonQ == resApiId, "timestamp on Q should be apiID");
        res3 = await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,pay2).encodeABI()}) 
		res = await web3.eth.abi.decodeParameters(['string','string','uint256','uint256'],res3.logs[2].data);
        let resSapi2 = res['0']
        let resApiId2 = await web3.eth.abi.decodeParameter('uint256',res3.logs[2].topics[2])
        res2 = await web3.eth.abi.decodeParameters(['string','bytes32','uint256'],res3.logs[1].data);
        let apiIdonQ2 = await web3.eth.abi.decodeParameter('uint256',res3.logs[1].topics[1])
        let apiOnQPayout2 = res2['2'];
        assert(web3.utils.fromWei(apiOnQPayout2) == 30, "2Current payout on Q should be 30");
        assert(web3.utils.hexToNumberString(apiIdonQ2) == web3.utils.hexToNumberString(resApiId2), "2timestamp on Q should be apiTimestamp");
        balance2 = await (oracle.balanceOf(accounts[2],{from:accounts[1]}));
        assert(web3.utils.fromWei(balance1) - web3.utils.fromWei(balance2) == 50, "balance should be down by 50")
        let addvaluePool =await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(test1,"ETH/USD",1000,pay).encodeABI()})
        balance3 = await (oracle.balanceOf(accounts[2],{from:accounts[0]}));
        assert(web3.utils.fromWei(balance1) - web3.utils.fromWei(balance3) == 70, "balance should be down by 70")
        res2 = await web3.eth.abi.decodeParameters(['string','bytes32','uint256'],addvaluePool.logs[1].data);
        let vpApiIdonQ = await web3.eth.abi.decodeParameter('uint256',addvaluePool.logs[1].topics[1])
        let vpapiOnQPayout = res2['2'];
        assert(web3.utils.fromWei(vpapiOnQPayout) == 40, "Current payout on Q should be 40");
        assert(web3.utils.hexToNumberString(vpApiIdonQ) == 2, "timestamp on Q should be apiTimestamp");        
    }); 
   it("Test 51 request and lowest is kicked out", async function () {
   	       apiVars= await oracle.getRequestVars(1)
        apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(0);
        apiId = await oracle.getRequestIdByQueryHash(apiVars[2]);
        assert(web3.utils.hexToNumberString(apiId) == 1, "timestamp on Q should be 1");
        console.log("51 requests....");
         for(var i = 1;i <=51 ;i++){
        	apix= ("api" + i);
        	await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"",1000,i).encodeABI()})
        }
        let payoutPool = await oracle.getRequestQ();
        for(var i = 2;i <=49 ;i++){
        	assert(payoutPool[i] == 51-i)

        }
        apiVars= await oracle.getRequestVars(52)
        apiIdforpayoutPoolIndex = await oracle.getRequestIdByRequestQIndex(50);
        vars = await oracle.getVariablesOnDeck();
        let apiOnQ = web3.utils.hexToNumberString(vars['0']);
        let apiPayout = web3.utils.hexToNumberString(vars['1']);
        let sapi = vars['2'];
        apiIdforpayoutPoolIndex2 = await oracle.getRequestIdByRequestQIndex(49);
        assert(apiIdforpayoutPoolIndex == 52, "position 1 should be booted"); 
        assert(sapi == "api51", "API on Q string should be correct"); 
        assert(apiPayout == 51, "API on Q payout should be 51"); 
        assert(apiOnQ == 52, "API on Q should be 51"); 
        assert(apiVars[5] == 51, "position 1 should have correct value"); 
        assert(apiIdforpayoutPoolIndex2 == 3, "position 2 should be in same place"); 
   });
    it("Test Throw on wrong apiId", async function () {
        await helper.expectThrow(web3.eth.sendTransaction({to: oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.submitMiningSolution("2",4,3000).encodeABI()}) );
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[1],gas:7000000,data:oracle2.methods.submitMiningSolution("2",1,3000).encodeABI()})
    });
    it("Stake miner", async function (){
         balance2 = await oracle.balanceOf(accounts[2]);
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.transfer(accounts[6],web3.utils.hexToNumberString(balance2)).encodeABI()})
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[6],gas:7000000,data:oracle2.methods.depositStake().encodeABI()})
       	let s =  await oracle.getStakerInfo(accounts[6])
        assert(s[0] == 1, "Staked" );
    });
    it("Test competing API requests - multiple switches in API on Queue", async function () {
    	 await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,0).encodeABI()})
		await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,0).encodeABI()})
         await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData("api3","",1000,1).encodeABI()})
         await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,2).encodeABI()})
         await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData("api3","",1000,3).encodeABI()})
         await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(api2,"ETH/USD",1000,4).encodeABI()})
        vars = await oracle.getVariablesOnDeck();
        let apiOnQ = web3.utils.hexToNumberString(vars['0']);
        let apiPayout = web3.utils.hexToNumberString(vars['1']);
        let sapi = vars['2'];
        console.log(await oracle.getRequestQ());
        assert(apiOnQ == 2, "API on Q should be 2"); 
        assert(sapi == api2, "API on Q string should be correct"); 
        assert(apiPayout == 6, "API on Q payout should be 6"); 
    });
    it("Test New Tellor Storage Contract", async function () {
        assert(await oracle.getAddressVars(web3.utils.keccak256("tellorContract")) == oracleBase.address, "tellorContract should be Tellor Base");
        let oracleBase2 = await Tellor.new();
         await web3.eth.sendTransaction({to:oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.theLazyCoon(accounts[2],web3.utils.toWei('5000', 'ether')).encodeABI()})
       console.log('test', await oracle.balanceOf(accounts[1]))
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.proposeFork(oracleBase2.address).encodeABI()})
        for(var i = 1;i<5;i++){
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[i],gas:7000000,data:oracle2.methods.vote(1,true).encodeABI()})
        }
        await helper.advanceTime(86400 * 8);
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[i],gas:7000000,data:oracle2.methods.tallyVotes(1).encodeABI()})
        console.log(1);
        assert(await oracle.getAddressVars(web3.utils.keccak256("tellorContract")) == oracleBase2.address);
    });
        it("Test Failed Vote - New Tellor Storage Contract", async function () {
        assert(await oracle.getAddressVars(web3.utils.keccak256("tellorContract")) == oracleBase.address, "tellorContract should be Tellor Base");
        let oracleBase2 = await Tellor.new();
        await web3.eth.sendTransaction({to:oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.theLazyCoon(accounts[2],web3.utils.toWei('5000', 'ether')).encodeABI()})
        
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.proposeFork(oracleBase2.address).encodeABI()})
        for(var i = 1;i<5;i++){
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[i],gas:7000000,data:oracle2.methods.vote(1,false).encodeABI()})
        }
        await helper.advanceTime(86400 * 8);
        await web3.eth.sendTransaction({to: oracle.address,from:accounts[i],gas:7000000,data:oracle2.methods.tallyVotes(1).encodeABI()})
        assert(await oracle.getAddressVars(web3.utils.keccak256("tellorContract")) == oracleBase.address, "vote should have failed");
    });
    it("Test Deity Functions", async function () {
    	let owner = await oracle.getAddressVars(web3.utils.keccak256("_deity"));
    	assert(owner == accounts[0])
    	await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:master.methods.changeDeity(accounts[1]).encodeABI()})
		owner = await oracle.getAddressVars(web3.utils.keccak256("_deity"));
		assert(owner == accounts[1])
		let newOracle = await Tellor.new();
		await web3.eth.sendTransaction({to: oracle.address,from:accounts[1],gas:7000000,data:master.methods.changeTellorContract(newOracle.address).encodeABI()})
		assert(await oracle.getAddressVars(web3.utils.keccak256("tellorContract")) == newOracle.address);
    });
});