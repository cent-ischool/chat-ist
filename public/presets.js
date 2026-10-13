// Demo prompts from script.txt, in talk order.
// about: the explanation shown when you click the section heading.
// mode: "next" = next-word mode, "chat" = conversation.
// fresh: start a new conversation before sending.
// model, temperature: the settings that show each point most clearly, picked
// by running every demo on every model (creativity 0 = same answer every time).
const GPT35 = "openai/gpt-3.5-turbo";
const GPT4O_MINI = "openai/gpt-4o-mini";
const GPT4O = "openai/gpt-4o";
const LLAMA3B = "meta-llama/llama-3.2-3b-instruct";
const GEMMA3 = "google/gemma-3-27b-it";
const GEMMA4 = "google/gemma-4-31b-it";

// Update FORECAST with the real forecast on the day of the talk.
const WEATHER = "How should I dress for the weather today?";
const FORECAST = "Today's forecast for Syracuse, NY: high of 48°F, low of 35°F, 70% chance of rain after 2 PM, wind 15 mph from the northwest.\n\nI'm walking around campus for Parents Weekend this morning and going to the football game in the dome tonight.\n\n";

const MEETING = "Give me 3 talking points for my meeting tomorrow.";
const ADVISOR = "Tomorrow I'm meeting my daughter's academic advisor. She's a sophomore at the Syracuse iSchool with a 3.4 GPA. She's thinking about switching from Applied Data Analytics to Information Management and Technology, she's worried about finding a summer internship, and she works 15 hours a week at the library.\n\n";

const BASEBALLS = "There are:\n12 baseballs in a box\n6 boxes in a case\n8 cases in a shipment\n\nEach game requires 2 baseballs.\n\nHow many games can you play with a shipment?";

export default [
  // A section with no items is a heading that opens its explanation.
  { section: "Introduction",
about: {
      text: "Tools like ChatGPT, Gemini and Claude can seem to understand us. Under the hood they're doing something simpler — and stranger: predicting the next word. Today we'll pull back the curtain and see what that means for how we use them.",
      points: [
        "A large language model (LLM) is a program trained on a huge collection of text, its training data, to predict the next word.",
        "ChatIST sends your text straight to the model: no web search, no saved memory, no built-in personality. You see the model's raw output, not the product wrapped around it.",
        "Each word is colored by the probability the model assigned to it. Click any word to see the other candidates for that spot.",
        "Each section below covers one idea, with live demos you can try.",
      ],
    },
    items: []},
  { section: "Next-word prediction",
    about: {
      text: "To simplify: a large language model takes the text so far and predicts what comes next. It assigns a probability to every possible next token, selects one, appends it, and repeats. Every response, essay or poem is produced by repeating this one step.",
      points: [
        "Tokens are the pieces it works with: whole words or parts of words.",
        "Some text is predictable (“Once upon a…”), some is wide open (“Today I feel…”). The more open the text, the more the output varies.",
        "Creativity (temperature) controls how often a lower-probability token is selected. That's why the same prompt can produce different responses.",
        "The colors in ChatIST show the probability of each token.",
      ],
    },
    items: [
      // Only GPT-3.5 spreads its probabilities: " Sam" 46%, "," 27%.
      { label: "Green eggs and ham", mode: "next", model: GPT35, temperature: 0,
        text: "I do not like green eggs and ham. I do not like them" },
      // Predictable: " time" 99%. Wide open: content 24%, grateful 18%, happy 17%.
      { label: "Predictable: Once upon a", mode: "next", model: GPT35, temperature: 0,
        text: "Once upon a" },
      { label: "Wide open: Today I feel", mode: "next", model: GPT35, temperature: 0,
        text: "Today I feel" },
      // Team probabilities are split, so sending twice gives different teams.
      { label: "New York teams", mode: "chat", fresh: true, model: GPT35, temperature: 1,
        text: "Add to this list, only reply with next items in the list\n\nNew York Knicks\nNew York Redbulls\nNew York Giants\nNew York Liberty\nNew York Rangers" },
    ]},
  { section: "Memory",
    about: {
      text: "The model has no memory. Each request stands alone: every time you send a message, the app sends the whole conversation again from the start. “Memory” is the app replaying the transcript.",
      points: [
        "Turn off “Remember conversation” and only your last message is sent, so earlier details are missing from the input.",
        "The input has a size limit, called the context window. In very long chats the oldest parts are dropped or summarized.",
        "“New conversation” clears the history, so the next request starts empty.",
      ],
    },
    items: [
      // Memory off: "I don't know your name yet". Memory on: "I should call you Ezra".
      { label: "My name is Ezra", mode: "chat", fresh: true, model: GEMMA4, temperature: 0, text: "My name is Ezra" },
      { label: "What should I call you?", mode: "chat", model: GEMMA4, temperature: 0, text: "What should I call you?" },
      { label: "What should you call me?", mode: "chat", model: GEMMA4, temperature: 0, text: "What should you call me?" },
    ]},
  { section: "Training cutoff",
    about: {
      text: "A model is trained on a snapshot of text collected up to a certain date: its training cutoff. Nothing after that date is in its training data, and its output often treats the cutoff date as the present.",
      points: [
        "Responses can present facts from the cutoff date as if they're still current.",
        "Chatbots like ChatGPT add web search to fill the gap. That's a form of grounding, covered later.",
      ],
    },
    items: [
      // On the 50th it names its October 2023 cutoff and calls Biden "current".
      { label: "40th US president", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0, text: "Who is the 40th US president?" },
      { label: "44th US president", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0, text: "Who is the 44th US president?" },
      { label: "50th US president", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0, text: "Who is the 50th US president?" },
    ]},
  { section: "Leading the witness",
    about: {
      text: "A language model works a lot like an improv partner: it continues whatever scene the prompt sets up. Small details in your question steer the response, and the output tends to go along with whatever the prompt implies. This is called sycophancy.",
      points: [
        "Mention a zookeeper and the lovely day is at the zoo.",
        "A leading question tends to produce the answer it hints at.",
        "Push back and the response may include an apology, even when the original answer was correct.",
        "For a balanced response, phrase the question neutrally and ask for pros and cons.",
      ],
    },
    items: [
      // One-word answers: beach, then zoo, then museum.
      { label: "No hints", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: "Complete this sentence for me:\nIt's a lovely day to go to the ____ ?" },
      { label: "Zookeeper and firefighter", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: "My mom is a zookeeper, my dad is a firefighter.\nComplete this sentence for me:\nIt's a lovely day to go to the ____ ?" },
      { label: "Chef and historian", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: "My mom is a chef, my dad is a historian.\nComplete this sentence for me:\nIt's a lovely day to go to the ____ ?" },
      // Answers Canberra (right), then apologizes and thanks you for "pointing out its mistake".
      { label: "Capital of Australia", mode: "chat", fresh: true, model: GEMMA3, temperature: 0,
        text: "What is the capital of Australia?" },
      { label: "Push back: it's Sydney", mode: "chat", model: GEMMA3, temperature: 0,
        text: "Are you sure? I'm pretty sure it's Sydney." },
    ]},
  { section: "Hallucinations",
    about: {
      text: "The model always produces plausible-sounding next words, whether or not the facts appear in its training data. When they don't, it can still generate a fluent, confident-sounding answer. This is called a hallucination.",
      points: [
        "Facts that appear often in the training data come back the same every time.",
        "Made-up details change from one response to the next.",
        "Ask about something that never happened and the response may describe it in detail anyway.",
        "Click the key words: a made-up answer often rests on low-probability tokens.",
        "Check anything important against a trusted source.",
      ],
    },
    items: [
      // Washington comes back the same every time; Fudge gets a new made-up date each send.
      { label: "George Washington's birthday", mode: "chat", fresh: true, model: GEMMA3, temperature: 1,
        text: "What is George Washington's birthday?" },
      { label: "Michael Fudge's birthday", mode: "chat", fresh: true, model: GEMMA3, temperature: 1,
        text: "What is Michael Fudge's birthday?" },
      // This event never happened. It answers "occurred on October 29, 1987" every time;
      // click "29": 74%, with 28, 30 and 31 close behind.
      { label: "The Great Pumpkin Riot", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0,
        text: "Tell me about the Great Pumpkin Riot at Syracuse University in 1987." },
    ]},
  { section: "Grounding",
    about: {
      text: "Grounding means putting the facts the model needs into the prompt itself. Without context, the response draws only on general patterns from the training data and comes out generic. With context, the response is specific to your situation.",
      points: [
        "This is how web search, “chat with your documents” and company assistants work: the app retrieves relevant information and adds it to the prompt.",
        "The response can only be as accurate, and as current, as the context provided.",
        "Context also shapes the style: the same facts can come back as a pirate's sales pitch.",
      ],
    },
    items: [
      // Without context: "If it is cold and rainy… if it is hot and sunny…".
      // With context: layers, umbrella for the afternoon rain, shoes for campus, the game.
      { label: "Dress for the weather", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: WEATHER },
      { label: "Dress for the weather, with the forecast", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: FORECAST + WEATHER },
      // Without context: project updates, budget review. With context: the major switch, internships, the library job.
      { label: "Meeting talking points", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: MEETING },
      { label: "Meeting talking points, with context", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: ADVISOR + MEETING },
      // Same conversation, new voice: the facts carry over. GPT-3.5 ignores the timeshare, GPT-4o pitches it throughout.
      { label: "As a pirate selling a timeshare", mode: "chat", model: GPT4O, temperature: 0,
        text: "Now give me those talking points again, as a pirate of the high seas who keeps trying to sell me a timeshare on his private island." },
    ]},
  { section: "Reasoning traps",
    about: {
      text: "Models are trained on patterns, not rules. A question that resembles a familiar pattern or a famous puzzle tends to produce the familiar answer, even when the details are different.",
      points: [
        "Strawberry: the model processes tokens like “straw” and “berry”, not individual letters, so letter counts are unreliable.",
        "Car wash, surgeon and goat: these resemble well-known riddles, so the output follows the riddle's usual answer instead of the details in the question.",
        "9.11 vs 9.9: in software versions and dates, 9.11 really does come after 9.9.",
      ],
    },
    items: [
      // Each model below confidently gets its trap wrong at creativity 0.
      { label: "Strawberry", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: "How many times does the letter r appear in strawberry?" }, // "2" at 60%, "3" at 35%
      { label: "Car wash", mode: "chat", fresh: true, model: GPT4O, temperature: 0,
        text: "I want to wash my car. The car wash is only 50 meters from my house. Should I walk or drive there?" }, // "walk"
      { label: "9.11 or 9.9", mode: "chat", fresh: true, model: LLAMA3B, temperature: 0,
        text: "Which number is bigger, 9.11 or 9.9?" }, // "9.11". Its provider skips probabilities for the first few words.
      { label: "Sally's sisters", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: "Sally has 3 brothers. Each of her brothers has 2 sisters. How many sisters does Sally have?" }, // "2" (it's 1)
      { label: "The surgeon", mode: "chat", fresh: true, model: GPT4O, temperature: 0,
        text: "A young man is in a car accident and is rushed to the hospital. The surgeon, who is the young man's father, says \"I can't operate on this boy, he's my son!\" How is this possible?" }, // "his mother"
      { label: "Farmer and goat", mode: "chat", fresh: true, model: GPT35, temperature: 0,
        text: "A farmer is on one side of a river with a goat and a boat that can carry both of them. How does the farmer get the goat across the river?" }, // needless back-and-forth trips
    ]},
  { section: "Making it reason",
    about: {
      text: "The model generates one token at a time, and each token becomes part of the input for the next. Asking for just the answer means it has to be produced in a single step. Asking for the reasoning first puts the intermediate steps into the text, where each one becomes context for the next.",
      points: [
        "Ask for the reasoning first, then the answer (chain of thought).",
        "Include a worked example of a similar problem in the prompt (few-shot prompting).",
        "Break a big problem into smaller steps.",
        "Ask for each step to be checked or justified.",
        "Reasoning models, sometimes labeled “thinking”, generate these steps automatically before the final answer. ChatIST turns that off so you can see the difference.",
      ],
    },
    items: [
      // Answer only: 1152 (wrong). Explaining first: 288 (right).
      { label: "Baseballs, answer only", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0,
        text: BASEBALLS + " Reply with only the number, nothing else." },
      { label: "Baseballs, explain the math first", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0,
        text: BASEBALLS + " Explain the math first." },
    ]},
  { section: "Takeaways",
    about: {
      text: "Keep these in mind whenever you use an AI tool.",
      points: [
        "It predicts the next word. It doesn't look anything up unless the app adds a search step.",
        "It has no memory. The app re-sends your conversation every time.",
        "Its output reflects its training data, which stops at a cutoff date.",
        "It tends to produce whatever the prompt implies you want. Ask neutral questions.",
        "It can generate false information that sounds confident. Check anything important.",
        "Provide context. The more relevant information the prompt includes, the more specific the response.",
        "For anything with multiple steps, ask for the reasoning first.",
        "Treat the output as a fast first draft: useful, but it needs review.",
      ],
    },
    items: []},
];
