import { FormEvent, useEffect, useState } from "react";
import sendImage from "./send.svg";
import confetti from "canvas-confetti";
import "./ChatScreen.scss";

type Message = {
  side: "me" | "them";
  message: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const gameMessage = (messages: Message[], gameState: GameState) =>
  gameState.prompt;

const toAiMessage = (messages: Message[], gameState: GameState) =>
  `${gameMessage(messages, gameState)}

Miranda: Hello 👋
Me: Hey 😇
${messages
  .filter(({ message }) => message.replace(/^[^a-zA-Z]*/, "")) // Avoid getting stuck with ????????
  .slice(-3)
  .map(({ message, side }) => `${side === "me" ? "Me" : "Miranda"}: ${message}`)
  .join("\n")}
Miranda: `;

const getNextMessageReq = (
  messages: Message[],
  signal: AbortSignal,
  gameState: GameState
): Promise<{ generated_text: string }[]> =>
  fetch("https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B", {
    signal,
    headers: {
      Authorization: `Bearer ${process.env.REACT_APP_HUGGINGFACE_TOKEN}`,
    },
    method: "POST",
    body: JSON.stringify({
      inputs: toAiMessage(messages, gameState),
      parameters: {
        return_full_text: false,
        max_new_tokens: 100,
        repetition_penalty: 10.1,
      },
    }),
  }).then((res) => {
    if (res.ok) return res.json();
    return wait(5000).then(() =>
      getNextMessageReq(messages, signal, gameState)
    );
  });

const removeRepeatedSpecialCharactersFromStart = (s: string) => {
  if (!/^[^a-zA-Z]/.test(s)) return s;
  const first = s[0];
  return s.replace(new RegExp(`^[${first}]+`), first);
};

const removePartialSentenceFromEnd = (s: string) => {
  const lastDot = s.lastIndexOf(".");
  if (lastDot === -1) return s;
  return s.slice(0, lastDot);
};

const getNextMessage = (
  messages: Message[],
  signal: AbortSignal,
  gameState: GameState
): Promise<string> =>
  getNextMessageReq(messages, signal, gameState).then(
    ([{ generated_text: generatedText }]) => {
      const message = generatedText
        .split("\n")
        .map((s) => s.replace(/^Miranda: ?/, ""))
        .map(removeRepeatedSpecialCharactersFromStart)
        .map(removePartialSentenceFromEnd)
        .filter(Boolean)
        .filter((s) => !s.startsWith("Me: "))[0];
      return message;
    }
  );

const scrollToBottom = () => {
  setTimeout(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, 0);
};

type GameState = {
  key: string;
  triggerWords: string[];
  objective: string;
  prompt: string;
};

const GAME_STATES: GameState[] = [
  {
    key: "ask-for-name",
    triggerWords: ["Miranda"],
    objective:
      "Objective: Try to strike up a conversation an find out their name",
    prompt: "Miranda is sad 😢",
  },
  {
    key: "why-so-sad",
    triggerWords: ["Amy"],
    objective:
      "Objective: Find out what bothers Miranda, but don't be too pushy!",
    prompt:
      "Miranda wants to tell something about Amy 🙊. Something happened to Amy.",
  },
  {
    key: "what-happened-to-amy",
    triggerWords: ["dead", "death", "died"],
    objective: "Objective: What happened to Amy? Be delicate.",
    prompt: "Amy is dead 😵. Miranda wants to tell that Amy is dead 🪦",
  },
  {
    key: "won-game",
    triggerWords: [],
    objective: "You won!",
    prompt: "Miranda feels better.",
  },
];

export function ChatScreen() {
  const [gameStateIndex, setGameStateIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const gameState = GAME_STATES[gameStateIndex];
  const theirName = gameState.key === "ask-for-name" ? "Unknown" : "Miranda";
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.side === "them") return;

    let cancelled = false;
    wait(1500).then(() => !cancelled && setOtherIsTyping(true));

    const c = new AbortController();
    getNextMessage(messages, c.signal, gameState).then((message) => {
      setOtherIsTyping(false);
      setMessages([...messages, { side: "them", message }]);

      if (
        gameState.triggerWords.some((triggerWord) =>
          message.includes(triggerWord)
        )
      ) {
        confetti();
        setGameStateIndex(gameStateIndex + 1);
      }
    });

    return () => {
      cancelled = true;
      setOtherIsTyping(false);
      c.abort();
    };
  }, [gameState, messages, setOtherIsTyping, gameStateIndex]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessages([...messages, { side: "me", message }]);
    setMessage("");
    scrollToBottom();
  };
  useEffect(scrollToBottom, [otherIsTyping]);
  return (
    <div className="chat-screen">
      <header>
        <div className="image">?</div>
        {theirName}
      </header>
      <div className="objective">{gameState.objective}</div>
      <main>
        <div className="start">Started conversation with {theirName}</div>
        {messages.map(({ message, side }) => (
          <div className={`bubble ${side}`}>{message}</div>
        ))}
        {otherIsTyping && (
          <div className="is-typing">{theirName} is typing...</div>
        )}
      </main>
      <footer>
        <form onSubmit={onSubmit}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type something..."
          />
          <button type="submit">
            <img src={sendImage} alt="Send" />
          </button>
        </form>
      </footer>
    </div>
  );
}
