import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push, get, remove } from 'firebase/database'

import { Configuration, OpenAIApi } from 'openai'
import { process } from './env'

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(configuration)

const appSettings = {
    databaseURL: 'https://gpt-4-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app/'
}

const app = initializeApp(appSettings)

const database = getDatabase(app)

const conversationInDB = ref(database)

const chatbotConversation = document.getElementById('chatbot-conversation')

const instructionObj = {
    role: 'system',
    content: 'You are a helpful assistant.'
}

document.addEventListener('submit', (e) => {
    e.preventDefault()
    const userInput = document.getElementById('user-input')
    push(conversationInDB, {
        role: 'user',
        content: userInput.value
    })
    fetchReply()
    const newSpeechBubble = document.createElement('div')
    newSpeechBubble.classList.add('speech', 'speech-human')
    chatbotConversation.appendChild(newSpeechBubble)
    newSpeechBubble.textContent = userInput.value
    userInput.value = ''
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight
})

function fetchReply() {
    get(conversationInDB).then(async (snapshot) => {
        if (snapshot.exists()) {
            const conversationArr = Object.values(snapshot.val())
            conversationArr.unshift(instructionObj)
            const response = await openai.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: conversationArr,
                presence_penalty: 0,
                frequency_penalty: 0.3
            })
            push(conversationInDB, response.data.choices[0].message)
            renderTypewriterText(response.data.choices[0].message.content)
        }
        else {
            console.log('No data available')
        }

    })
}

function renderTypewriterText(text) {
    const newSpeechBubble = document.createElement('div')
    newSpeechBubble.classList.add('speech', 'speech-ai', 'blinking-cursor')
    chatbotConversation.appendChild(newSpeechBubble)
    let i = 0
    const interval = setInterval(() => {
        newSpeechBubble.textContent += text.slice(i - 1, i)
        if (text.length === i) {
            clearInterval(interval)
            newSpeechBubble.classList.remove('blinking-cursor')
        }
        i++
        chatbotConversation.scrollTop = chatbotConversation.scrollHeight
    }, 50)
}

document.getElementById('clear-btn').addEventListener('click', () => {
    remove(conversationInDB)
    chatbotConversation.innerHTML = '<div class="speech speech-ai">How can I help you?</div>'
})

function renderConversationFromDb(){
    get(conversationInDB).then(async (snapshot)=>{
        if(snapshot.exists()) {
            Object.values(snapshot.val()).forEach(databaseObj => {
                const newSpeechBubble = document.createElement('div')
                newSpeechBubble.classList.add(
                    'speech',
                    `speech-${databaseObj.role === 'user' ? 'human' : 'ai'}`
                    )
                chatbotConversation.appendChild(newSpeechBubble)
                newSpeechBubble.textContent = databaseObj.content
            })
            chatbotConversation.scrollTop = chatbotConversation.scrollHeight
        }
    })
}

renderConversationFromDb()