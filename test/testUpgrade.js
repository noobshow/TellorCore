/** 
* This tests the oracle functions, including mining.
*/
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));
const BN = require('bn.js');  
const helper = require("./helpers/test_helpers");
const TellorMaster = artifacts.require("./TellorMaster.sol");
const Tellor = artifacts.require("./Tellor.sol"); // globally injected artifacts helper
const oldTellor = artifacts.rquire("./oldContracts/Tellor.sol")
const oldMaster = artifacts.rquire("./oldContracts/oldMaster.sol")

var oracleAbi = Tellor.abi;
var oracleByte = Tellor.bytecode;
//var OldTellor = artifacts.require("./oldContracts/OldTellor.sol")
var masterAbi = TellorMaster.abi;
var api = "json(https://api.gdax.com/products/BTC-USD/ticker).price";
var api2 = "json(https://api.gdax.com/products/ETH-USD/ticker).price";

function promisifyLogWatch(_address,_event) {
  return new Promise((resolve, reject) => {
    web3.eth.subscribe('logs', {
      address: _address,
      topics: [web3.utils.sha3(_event)]
    }, (error, result) => {
        if (error){
          console.log('Error',error);
          reject(error);
        }
        else{
       	resolve(result);
    	}
    })
  });
}

contract('Upgrade Tests', function(accounts) {
  let oracle;
  let oracle2;
  let newOracle;
  let master;
  let oldTellor;
  let oldMaster;

    it("Test miner upgrade", async function () {
        //launch Old oracle
            oracleBase = await OldTellor.new();
            oldMaster = await OldMaster.new(oracleBase.address);
            oracle2 = await new web3.eth.Contract(oldTellor.abi,oracleBase.address);
        //request 51 data points
            for(var i = 1;i <=51 ;i++){
                apix= ("api" + i);
                await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"t",1000,i).encodeABI()});
            }
        //assert that count is correct and the requestQ is correct
            let apiIdonQ = await web3.eth.abi.decodeParameter('uint256',res2.logs[1].topics[1])
            let apiOnQPayout = res3['2'];
            assert(resSapi == api2,"string should be correct");
            assert(web3.utils.hexToNumberString(apiOnQPayout) == 51, "Current payout on Q should be 20");
            assert(web3.utils.hexToNumberString(apiIdonQ) == resApiId, "timestamp on Q should be apiID");
            vars = await oracle.getRequestVars(2);
            req = await oracle.getRequestQ();
            assert(req[1] == 1, "Request Q should be correct")
            assert(req[50] == 50, "Request Q 2 should be correct")
            await let rCount = oracle.getUintVars(web3.utils.keccak256("requestCount"))
            assert(rCount == 51, "request count should be correct")
            assert(vars[1] == "ETH/USD")
        //change the deity
            let owner = await oracle.getAddressVars(web3.utils.keccak256("_deity"));
            assert(owner == accounts[0])
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:master.methods.changeDeity(accounts[1]).encodeABI()})
            owner = await oracle.getAddressVars(web3.utils.keccak256("_deity"));
        //assert it changed
            assert(owner == accounts[1])
        balances = []
        for(var i = 0;i<6;i++){
            balances[i] = await oracle.balanceOf(accounts[i]);
        }
        //mine 5 values
            for(var i = 0;i < 5;i++){
                logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            }
        //assert payout is not decreasing
            new_balances = []
             for(var i = 0;i<6;i++){
                new_balances[i] = await oracle.balanceOf(accounts[i]);
            }
            assert((web3.utils.hexToNumberString(new_balances[5]) - web3.utils.hexToNumberString(balances[5])) == web3.utils.toWei('5', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances[1]) - web3.utils.hexToNumberString(balances[1])) == web3.utils.toWei('5', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances[2]) - web3.utils.hexToNumberString(balances[2])) == web3.utils.toWei('5', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances[3]) - web3.utils.hexToNumberString(balances[3])) == web3.utils.toWei('5', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances[4]) - web3.utils.hexToNumberString(balances[4])) == web3.utils.toWei('5', 'ether'));
        console.log("Stop the Miner....start slow Miner")
        //change tellorContract mid contract
        console.log("Mine 3")
            newOracle = await Tellor.new();
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:master.methods.changeTellorContract(newOracle.address).encodeABI()})

        console.log("Mine 2")
        //assert correct
            assert(await oracle.getAddressVars(web3.utils.keccak256("tellorContract")) == newOracle.address, "tellorContract should be Tellor Base");
        //mine all in requestQ
            for(var i = 0;i <= 46;i++){
                logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            }
        //assert that it is working
            res = web3.eth.abi.decodeParameters(['uint256','uint256'],logMineWatcher.data);
            console.log("res", res)
            assert(res['1'] > 0, "value should be positive");
        //request 2 new data points
            for(var i = 52;i <=53 ;i++){
                apix= ("api" + i);
                await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"t",1000,i).encodeABI()});
            }
        //mine 2
            for(var i = 0;i <= 1;i++){
                logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            }
        //request 3 new data points
            for(var i = 54;i <=56 ;i++){
                apix= ("api" + i);
                await web3.eth.sendTransaction({to: oracle.address,from:accounts[2],gas:7000000,data:oracle2.methods.requestData(apix,"t",1000,i).encodeABI()});
            }
        //mine 3
            for(var i = 0;i <= 2;i++){
                logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            }
        //assert that the payout is decreasing
            balances = []
            for(var i = 0;i<6;i++){
                balances[i] = await oracle.balanceOf(accounts[i]);
            }
            logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            new_balances2 = []
            for(var i = 0;i<6;i++){
                new_balances2[i] = await oracle.balanceOf(accounts[i]);
            }
            assert((web3.utils.hexToNumberString(new_balances2[5]) - web3.utils.hexToNumberString(new_balances[5])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[1]) - web3.utils.hexToNumberString(new_balances[1])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[2]) - web3.utils.hexToNumberString(new_balances[2])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[3]) - web3.utils.hexToNumberString(new_balances[3])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[4]) - web3.utils.hexToNumberString(new_balances[4])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[5]) - web3.utils.hexToNumberString(new_balances[5])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[1]) - web3.utils.hexToNumberString(new_balances[1])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[2]) - web3.utils.hexToNumberString(new_balances[2])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[3]) - web3.utils.hexToNumberString(new_balances[3])) > web3.utils.toWei('4.9', 'ether'));
            assert((web3.utils.hexToNumberString(new_balances2[4]) - web3.utils.hexToNumberString(new_balances[4])) > web3.utils.toWei('4.9', 'ether'));
        //assert that the total supply / dev share is correct
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,0).encodeABI()})
            initTotalSupply = await oracle.totalSupply();
            begbal = await oracle.balanceOf(accounts[0]);
            logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            newTotalSupply = await oracle.totalSupply();
            it= await web3.utils.fromWei(initTotalSupply, 'ether');
            ts= await web3.utils.fromWei(newTotalSupply, 'ether');         
            tsChange = ts-it
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:oracle2.methods.requestData(api,"BTC/USD",1000,0).encodeABI()})
            initTotalSupply = await oracle.totalSupply();
            logMineWatcher = await promisifyLogWatch(oracle.address, 'NewValue(uint256,uint256,uint256,uint256,bytes32)');//or Event Mine?
            newOracle = await Tellor.new();
            await web3.eth.sendTransaction({to: oracle.address,from:accounts[0],gas:7000000,data:master.methods.changeTellorContract(newOracle.address).encodeABI()})
            newTotalSupply = await oracle.totalSupply();
            it= await web3.utils.fromWei(initTotalSupply, 'ether');
            ts= await web3.utils.fromWei(newTotalSupply, 'ether');   
            tsChange2 = ts-it      
            console.log(tsChange2,tsChange)
            assert(tsChange2 < tsChange,"TS change should go down");
            endbal = await oracle.balanceOf(accounts[0]);
            assert((endbal - begbal)/1e18  > 2.4, "devShare")
            assert((endbal - begbal)/1e18  < 2.5, "devShare")
        //assert that the ocount is correct
            await let rCount = oracle.getUintVars(web3.utils.keccak256("requestCount"))
            assert(rCount == 57, "request count should be correct")


   });
 });    