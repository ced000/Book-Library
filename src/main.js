import './style.css'
import { create } from 'ipfs-http-client'
import { newKitFromWeb3 } from '@celo/contractkit'
import Web3 from "@celo/contractkit/node_modules/web3"
import booklibraryAbi from '../contract/booklibrary.abi.json'

const BooklibraryContractAddress = "0xE0531c98Da1173Cf7ad7dD8E5E9C968169d42e43";
const ipfsClient = create({
  url: 'https://ipfs.infura.io:5001/api/v0'
})

let kit, contract;
let services = [];

window.addEventListener('load', async () => {
  bookNotification("⌛ Loading...")
  await connectCeloWallet()
  await getBooks()
  bookNotificationOff()
});

const connectCeloWallet = async function () {
  if (window.celo) {
    bookNotification("⚠️ Please approve this DApp to use it.")
    try {
      await window.celo.enable()
      bookNotificationOff()

      const web3 = new Web3(window.celo)
      kit = newKitFromWeb3(web3)

      const accounts = await kit.web3.eth.getAccounts()
      kit.defaultAccount = accounts[0]

      contract = new kit.web3.eth.Contract(booklibraryAbi, BooklibraryContractAddress)
    } catch (error) {
      bookNotification(`⚠️ ${error}.`)
    }
  } else {
    bookNotification("⚠️ Please install the CeloExtensionWallet.")
  }
}

const getBooks = async function() {
  const _booksLength = await contract.methods.booksLength().call()
  const _books = []
    for (let i = 0; i < _booksLength; i++) {
    let _book = new Promise(async (resolve, reject) => {
      let p = await contract.methods.readBook(i).call()
    
      resolve({
        index: i,
        user: p[0],
        title: p[1],
        image: p[2],
        isbn: p[3],
        date: p[4]
      })
    })
    _books.push(_book)
  }
  services = await Promise.all(_books)
  renderBooks()
}

const uploadHelper = async (_file) => {
  try {
    const file = await ipfsClient.add(_file);
    // console logging of file removed - I assume this was to check if ipfsClient operation was done.
    const path = `https://ipfs.infura.io/ipfs/${file.path}`;
  
    return path;
  } catch (error) {
    console.log("Error uploading file: ", error);
    throw error;
  }
};

// Adding a current-date function hence not user-defined. 

const dateNow = () => {
  let date = new Date();
  const options = {year: "numeric", month: "long", day: "numeric"};
  return date.toLocaleString(undefined, options);
  
}

document
  .querySelector("#submit-book")
  .addEventListener("click", async (e) => {
    let readableDate = dateNow();
    const selectedImage = document.getElementById("select-image").files[0];
    const ipfs_bookImage = await uploadHelper(selectedImage);
    const bookParams = [
      document.getElementById("input-title").value,
      ipfs_bookImage,
      document.getElementById("input-isbn").value,

      // Adding a human-readable date to the list of parameters
      readableDate
    ]

    bookNotification(`⌛ Adding "${bookParams[0]}"...`)
    try {
      await contract.methods.addBook(...bookParams)
      .send({from: kit.defaultAccount})
      .then(() => {
        bookNotification(`🎉 You successfully added "${bookParams[0]}".`)
        getBooks();
        bookNotificationOff(); // remove notification after books are rendered.
      }).catch((err) => {
        bookNotification(`⚠️ ${err}.`)
      })
    } catch (error) {
      bookNotification(`⚠️ ${error}.`)
    }
  })

function renderBooks() {
  document.getElementById("AvailableBooks").innerHTML = ""
  services.forEach((_book) => {
    const newDiv = document.createElement("div")
    newDiv.className = "col-md-4"
    newDiv.innerHTML = bookTemplate(_book)
    document.getElementById("AvailableBooks").appendChild(newDiv)
  })
}

function bookTemplate(_book) {

  return `
    <div class="card mb-4">
      <img class="card-img-top" src="${_book.image}" alt="...">
    </div>
      <div class="card-body text-dark text-left p-4 position-relative">
        <div class="translate-middle-y position-absolute top-0">
        ${identiconTemplate(_book.user)}
        </div>
        <h2 class="card-title fs-4 fw-bold mt-2">${_book.title}</h2>
        <p class="card-text mb-1">
          ${_book.isbn}             
        </p>
        <p class="card-text mb-4" style="min-height: 82px">
          ${_book.date}             
        </p>
          </div>
    </div>
  `
}


function identiconTemplate(_address) {
  const icon = blockies
    .create({
      seed: _address,
      size: 8,
      scale: 16,
    })
    .toDataURL()

  return `
  <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
    <a href="https://alfajores-blockscout.celo-testnet.org/address/${_address}/transactions"
        target="_blank">
        <img src="${icon}" width="48" alt="${_address}">
    </a>
  </div>
  `
}

function bookNotification(_text) {
  document.querySelector(".alert-service").style.display = "block"
  document.querySelector("#bookNotification").textContent = _text
}

function bookNotificationOff() {
  document.querySelector(".alert-service").style.display = "none"
}