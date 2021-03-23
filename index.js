const fetch = require('node-fetch');
const base64 = require('base-64');
const util = require('util')


//Disclaimer: J'aurais pu faire des fonctions pour Retrieve chaque donnée bien entendu (getRefreshToken, getToken etc..) 
// mais par soucis de temps et de simplicité à coder en premier "jet" j'ai decidé contre 

async function Main() {
    //Not secure, but as a more practical approach for this exercise
    let USER = {
        login: "BankinUser",
        password: "12345678",
        clientId: "BankinClientId",
        clientSecret: "secret"
    }

    //Login and retrieve token
    let REFRESHTOKEN = null;
    let TOKEN = null;

    //Create Necessary Header
    let headers = new fetch.Headers();
    headers.set('Authorization', 'Basic ' + base64.encode(USER.clientId + ":" + USER.clientSecret));
    headers.set('Content-Type', 'application/json');

    //Set login data and call API
    let loginData = {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
            user: USER.login,
            password: USER.password
        })
    }
    let loginResponse = await callApi('http://localhost:3000/login', loginData);
    
    //Check response
    if (!loginResponse.refresh_token) {
        return false;
    }
    REFRESHTOKEN = loginResponse.refresh_token;


    //Retrieve user token
    let tokenData = {
        method: "POST",
        body: new URLSearchParams({
            grant_type: "refresh_token", 
            refresh_token: REFRESHTOKEN 
        })
    }

    let tokenResponse = await callApi(`http://localhost:3000/token?`, tokenData);
    if (!tokenResponse.access_token) {
        return false;
    }

    TOKEN = tokenResponse.access_token;

    //Get all user's accounts
    let userData = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
        }
    }

    let accounts = await getAllAccounts("http://localhost:3000/accounts", userData);

    //Filter all accounts
    accounts = accounts.filter((value, index, array) => array.findIndex(v=>(v.acc_number===value.acc_number)) === index);

    //Get Transactions of each accounts
    for (let x = 0; x < accounts.length; x++) {
        const { acc_number } = accounts[x];
        accounts[x].transactions = await getTransactions(`http://localhost:3000/accounts/${acc_number}/transactions`, userData);
        accounts[x].transactions = accounts[x].transactions.filter((value, index, array) => array.findIndex(v=>(v.id===value.id)) === index);
    }

    return accounts;
    console.log(util.inspect(accounts, {showHidden: false, depth: null}))
};

async function callApi(url, opts) {
    let response = await fetch(url, opts);
    if (response.status !== 200) {
        return false;
    }
    response = await response.json();
    return response;
}

async function getAllAccounts(url, userData) {
    let userResponse = await callApi(url, userData);
    let accounts = userResponse.account;
    while (userResponse.link.next) {
        userResponse = await callApi(`http://localhost:3000${userResponse.link.next}`, userData);
        accounts = [...accounts, ...userResponse.account]
    }
    return accounts
}

async function getTransactions(url, userData) {
    let userResponse = await callApi(url, userData);
    let transactions = userResponse.transactions;
    if (!userResponse) {       
        return []; 
    }
    while (userResponse.link.next) {
        userResponse = await callApi(`http://localhost:3000${userResponse.link.next}`, userData);
        transactions = [...transactions, ...userResponse.transactions]

    }
    return transactions
}

Main();