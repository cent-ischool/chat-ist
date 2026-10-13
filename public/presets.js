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
  { section: "Next-word prediction",
    about: {
      text: "A language model does one thing: it looks at the text so far and predicts what comes next. It gives every possible next piece a probability, picks one, adds it, and repeats. Every answer, essay or poem is built from this one move.",
      points: [
        "The pieces are called tokens: whole words or parts of words.",
        "Some text is predictable (“Once upon a…”), some is wide open (“Today I feel…”). The more open it is, the more the answers vary.",
        "Creativity (temperature) controls how often it picks a less likely token. That's why the same question can get different answers.",
        "The colors in ChatIST show how sure the model was about each token.",
      ],
    },
    items: [
      // Only GPT-3.5 spreads its guesses: " Sam" 46%, "," 27%.
      { label: "Green eggs and ham", mode: "next", model: GPT35, temperature: 0,
        text: "I do not like green eggs and ham. I do not like them" },
      // Sure: " time" 99%. Wide open: content 24%, grateful 18%, happy 17%.
      { label: "Sure: Once upon a", mode: "next", model: GPT35, temperature: 0,
        text: "Once upon a" },
      { label: "Wide open: Today I feel", mode: "next", model: GPT35, temperature: 0,
        text: "Today I feel" },
      // Team guesses are split, so sending twice gives different teams.
      { label: "New York teams", mode: "chat", fresh: true, model: GPT35, temperature: 1,
        text: "Add to this list, only reply with next items in the list\n\nNew York Knicks\nNew York Redbulls\nNew York Giants\nNew York Liberty\nNew York Rangers" },
    ]},
  { section: "Remembering the conversation",
    about: {
      text: "The model has no memory. Every time you send a message, the app sends the whole conversation again from the start. “Memory” is just the app replaying the transcript.",
      points: [
        "Turn off “Remember conversation” and the model forgets everything except your last message.",
        "Conversations have a size limit. In very long chats the oldest parts get dropped or summarized.",
        "“New conversation” gives the model a blank slate.",
      ],
    },
    items: [
      // Memory off: "I don't know your name yet". Memory on: "I should call you Ezra".
      { label: "My name is Ezra", mode: "chat", fresh: true, model: GEMMA4, temperature: 0, text: "My name is Ezra" },
      { label: "What should I call you?", mode: "chat", model: GEMMA4, temperature: 0, text: "What should I call you?" },
      { label: "What should you call me?", mode: "chat", model: GEMMA4, temperature: 0, text: "What should you call me?" },
    ]},
  { section: "Knowledge cutoff",
    about: {
      text: "A model learns from a snapshot of text collected up to a certain date, its training cutoff. It knows nothing after that, and often doesn't realize time has passed.",
      points: [
        "It will confidently give answers that were true on its cutoff date.",
        "Chatbots like ChatGPT add web search to fill the gap. That's a form of grounding, coming up later.",
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
      text: "A language model is an improv partner: it continues whatever scene you set up. Small details in your question steer the answer, and models tend to agree with whatever you seem to want. This is called sycophancy.",
      points: [
        "Mention a zookeeper and the lovely day is at the zoo.",
        "A leading question gets the answer you hinted at.",
        "If you want an honest opinion, ask neutrally and ask for pros and cons.",
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
    ]},
  { section: "Hallucinations",
    about: {
      text: "The model always produces the most plausible-sounding next words, whether or not it knows the facts. When it doesn't know, it can invent a fluent, confident answer. This is called a hallucination.",
      points: [
        "Well-known facts come back the same every time.",
        "Made-up facts change each time you ask.",
        "Ask about something that never happened and it may describe it in detail anyway.",
        "Click the key words: an invented answer often rests on low-probability guesses.",
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
      text: "Grounding means putting the facts the model needs into the prompt itself. Without context it falls back on general knowledge and gives a generic answer. With context, the answer fits your situation.",
      points: [
        "This is how web search, “chat with your documents” and company assistants work: they find relevant information and paste it into the prompt for you.",
        "The answer can only be as good, and as current, as the context you give it.",
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
    ]},
  { section: "Reasoning traps",
    about: {
      text: "Models learn patterns, not rules. A question that looks like a familiar pattern or a famous puzzle triggers the familiar answer, even when the details are different.",
      points: [
        "Strawberry: the model sees tokens like “straw” and “berry”, not individual letters, so counting letters is hard.",
        "Car wash, surgeon and goat: they look like well-known riddles, so the model gives the riddle's usual answer instead of reading the question.",
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
      text: "The model writes one token at a time, so it can only “think” on the page. Asking for just the answer forces a guess in a single step. Asking it to explain its reasoning first gives it room to work the problem out, and each step it writes becomes context for the next.",
      points: [
        "Ask it to explain its reasoning first, then give the answer (chain of thought).",
        "Show it a worked example of a similar problem first (few-shot prompting).",
        "Break a big problem into smaller steps.",
        "Ask it to check its answer, or to justify each step.",
        "“Thinking” or reasoning models do this automatically behind the scenes. ChatIST turns that off so you can see the difference.",
      ],
    },
    items: [
      // Answer only: 1152 (wrong). Explaining first: 288 (right).
      { label: "Baseballs, answer only", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0,
        text: BASEBALLS + " Reply with only the number, nothing else." },
      { label: "Baseballs, explain the math first", mode: "chat", fresh: true, model: GPT4O_MINI, temperature: 0,
        text: BASEBALLS + " Explain the math first." },
    ]},
];
