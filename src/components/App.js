import WalletConnectProvider from '@walletconnect/web3-provider';
import React, { Component } from 'react';
import { getChainByKeyValue, getChain, getAllChains } from 'evm-chains';
import Web3Modal from 'web3modal';
import Navbar from './Navbar';
import Main from './Main';

var Web3 = require('web3');
var INFURA_API_KEY = "ee0a76ad6de8448f933dad70e2d4ad54";

class App extends Component {

  async UNSAFE_componentWillMount() {
    await this.init()
  }

  /** Settings for:
    *   Web3Modal+WalletConnect 
    *   Web3Modal+MetaMask,
    *   MetaMask.
  */ 
  async init() {
    // Declare WalletConnect
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: INFURA_API_KEY,
        }
      }
    };

    var web3Modal = new Web3Modal({
      cacheProvider: true, // optional
      providerOptions, // required
      disableInjectedProvider: false, // Declare MetaMask
    });

    this.setState({web3Modal: web3Modal})

    //Settings for only MetaMask
    if(typeof window.ethereum!=='undefined'){
      let network, balance, web3

      window.ethereum.autoRefreshOnNetworkChange = false;
      web3 = new Web3(Web3.givenProvider)
      this.setState({web3: web3})

      //Update address&account when MM user change account
      window.ethereum.on('accountsChanged', async (accounts) => {
        if(typeof accounts[0] === 'undefined'){
          this.setState({ account: null, balance: null, provider: null, network: null})
          console.log("Account: " + this.state.account, "Balance: " + this.state.balance);
        } else if(this.state.provider === null){
          this.setState({account: null, balance: null, network: null, loading: true})
          network = await getChainByKeyValue(window.ethereum.chainId);
          balance = await web3.eth.getBalance(accounts[0])
          this.setState({account: accounts[0], balance: balance, loading: false })
          console.log("Account: " + this.state.account, "Balance: " + this.state.balance);
        }
      });

      //Update network when MM user change account network
      window.ethereum.on('chainChanged', async (chainId) => {
        this.setState({network: null, balance: null, loading: true, onlyNetwork: true})

        if(this.state.account){
          balance = await web3.eth.getBalance(this.state.account)
          this.setState({balance: balance})
        }

        network = await getChainByKeyValue(window.ethereum.chainId);
        console.log('New Network: ' + network);
        this.setState({ network: network.chain, loading: false, onlyNetwork: false})
        console.log("Account: " + this.state.account, "Balance: " + this.state.balance, "Network: " + this.state.network);
      });
    }
  }

  /**
    * "Connect" button, selecting provider via Web3Modal
  */ 
  async on(event) {
    event.preventDefault()

    // Restore provider session
    await this.state.web3Modal.clearCachedProvider();
    let provider, account, network, balance, web3
    
    try {      
      // Activate windows with providers (MM and WC) choice
      provider = await this.state.web3Modal.connect();
      console.log('Provider: ', provider)

      this.setState({ loading: true, provider: null }) 

      console.log("isMetaMask: " + provider.isMetaMask);
      if(provider.isMetaMask){ // When MetaMask was chosen as a provider
        account = provider.selectedAddress;
        const allChains = await getAllChains();
        // console.log('ChainId: ', provider.networkVersion, 'AllChain: ', allChains);
        network = await getChainByKeyValue(provider.networkVersion); 
        // console.log('ChainId: ', provider.networkVersion, 'Network: ', network);
        web3 = new Web3(Web3.givenProvider);
        balance = await web3.eth.getBalance(provider.selectedAddress);
      } else if (provider.wc){ // When WalletConect was chosen as a provider
        if(provider.accounts[0]!=='undefined') {
          account = await provider.accounts[0];
          network = await getChainByKeyValue(provider.chainId);
          web3 = new Web3(new Web3.providers.HttpProvider(network.rpc[0]));
          balance = await web3.eth.getBalance(account);
        } else { //handle problem with providing data
          account = null
          network = null
          balance = null
          web3 = new Web3(new Web3.providers.HttpProvider(network.rpc[0]));
        }
      } else {
        window.alert('Error, provider not recognized')
      }

      // console.log( "Account: " + account, "Balance: " + balance, "Network: " + network.name, 'ChainId: ', provider.chainId );

      this.setState({
        web3: web3,
        loading: false,
        account: account,
        balance: balance,
        provider: provider,
        network: network.chain
      })

    } catch(e) {
      console.log( "Account: " + account, "Balance: " + balance, "Network: " + network );
      console.log("Could not get a wallet connection", e);
      return;
    }

    // Update account&balance
    provider.on("accountsChanged", async (accounts) => {
      let account, balance, network, web3;

      this.setState({ account: null, balance: null, loading: true }); 

      if(provider.isMetaMask && provider.selectedAddress!==null){
        web3 = new Web3(provider);
        balance = await web3.eth.getBalance(provider.selectedAddress);
      } else if (provider.wc){
        account = provider.accounts[0];
        network = await getChainByKeyValue(provider.chainId);
        web3 = new Web3(new Web3.providers.HttpProvider(network.rpc[0]));
        balance = await web3.eth.getBalance(account);
      }

      this.setState({ account: accounts[0], balance: balance, loading: false });
    });

    // Update network
    provider.on("chainChanged", async (chainId) => {
      let account, balance, network, web3;
      this.setState({balance: null, network: null, loading: true });
      if(provider.isMetaMask && provider.selectedAddress!==null){
        web3 = new Web3(provider);
        balance = await web3.eth.getBalance(provider.selectedAddress);
        network = await getChainByKeyValue(provider.chainId);
      } else if(provider.wc){
        account = provider.accounts[0];
        network = await getChainByKeyValue(provider.chainId);
        web3 = new Web3(new Web3.providers.HttpProvider(network.rpc[0]));
        balance = await web3.eth.getBalance(account);
        this.setState({ balance: balance, network: network.chain, loading: false });
      } else if (provider.selectedAddress===null){
        network = await getChainByKeyValue(provider.chainId);
        this.setState({ network: network.chain, loading: false });
      }

      this.setState({ balance: balance, network: network.chain, loading: false });
    });
  }

  /**
    * Disconnect button
   */
  async off(event) {
    event.preventDefault();

    if(this.state.provider===null || typeof this.state.provider==='undefined'){
      window.alert('Logout on MetaMask'); // Inform to disconnect from MetaMask
    }
    else {
      if(this.state.provider!==null && this.state.provider.wc) {
        await this.state.provider.stop(); // Disconnect Web3Modal+WalletConnnect (QR code remains)
        this.setState({account: null, balance: null});

        //In case if MetaMask is installed
        if(window.ethereum){
          const network = await getChainByKeyValue(window.ethereum.chainId);
          this.setState({network: network.chain})
        } else {
          this.setState({network: null})
        }
      } else if (this.state.provider!==null && this.state.provider.isMetaMask){
        await this.state.provider.close // Disconnect Web3Modal+MetaMask
      }
      // Reset UI
      this.setState({provider: null});

      // Restart provider session
      await this.state.web3Modal.clearCachedProvider();
     }
  }

  async offQr(event) {
    event.preventDefault()

    if(this.state.provider.wc){
      await this.state.provider.disconnect()
      this.setState({
        account: null,
        balance: null,
        provider: null
      })
      if(window.ethereum){
        const network = await getChainByKeyValue(window.ethereum.chainId);
        this.setState({network: network.chain})
      } else {
        this.setState({network: null})
      }
    }
  }

  /** 
    * "Send 1 Wei to yourself" button
  */
  async send(event){
    event.preventDefault()

    if(this.state.provider===null && !this.state.account) {
      window.alert('Error')
    } else if (this.state.provider===null && this.state.account) { //MetaMask
      this.state.web3.eth.sendTransaction({from: this.state.account, to: this.state.account, value: '1'}).on('error', (e) => window.alert('Error'))
    } else if(this.state.provider.isMetaMask || this.state.provider===null){ //Web3Modal+MetaMask
      this.state.web3.eth.sendTransaction({from: this.state.account, to: this.state.account, value: '1'}).on('error', (e) => window.alert('Error'))
    } else if (this.state.provider.wc){  //Web3Modal+WalletConnect
      window.alert('Accept on phone')

      //Declare data for JSON RPC request
      const from = this.state.account
      const to = this.state.account
      const value = 1 //wei

      //Request
      const tx = {
        "method": "eth_sendTransaction",
        "params": [{ from, to, value }]
      }

      try {
        await this.state.provider.request(tx) //Send request
      } catch (error) {
        console.log('error: ', error)
        return;
      }
    }
  }

  constructor(props) {
    super(props)
    this.state = {
      account: null,
      balance: null,
      network: null,
      provider: null,
      loading: false,
      onlyNetwork: false
    }

    this.on = this.on.bind(this)
    this.off = this.off.bind(this)
    this.send = this.send.bind(this)
    this.offQr = this.offQr.bind(this)
  }

  render() {
    return (
      <div>
        <Navbar
          on={this.on}
          off={this.off}
          account={this.state.account}
          loading={this.state.loading}
        />&nbsp;
        <Main
          send={this.send}
          offQr={this.offQr}
          account={this.state.account}
          balance={this.state.balance}
          loading={this.state.loading}
          network={this.state.network}
          provider={this.state.provider}
          onlyNetwork={this.state.onlyNetwork}
        />
      </div>
    );
  }
}

export default App;