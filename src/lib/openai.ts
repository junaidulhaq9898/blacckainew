import OpenAI from "openai"

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
  defaultHeaders: {
    "HTTP-Referer": "https://blacckai.com/", // Optional. Site URL for rankings on openrouter.ai.
    "X-Title": "Blacck AI", // Optional. Site title for rankings on openrouter.ai.
  }
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "openai/gpt-3.5-turbo",
    messages: [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  })

  console.log(completion.choices[0].message)
}
main()



