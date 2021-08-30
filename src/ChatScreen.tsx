import { FormEvent, useEffect, useState } from "react";
import sendImage from "./send.svg";
import "./ChatScreen.scss";

type Message = {
  side: "me" | "them";
  message: string;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toAiMessage = (messages: Message[]) => `Miranda ${
  messages.length > 10 ? "wants" : "does not want"
} to tell her name.

Miranda: Hello 👋
Me: Hi 😊
${messages
  .filter(({ message }) => message.replace(/^[^a-zA-Z]*/, "")) // Avoid getting stuck with ????????
  .slice(-3)
  .map(({ message, side }) => `${side === "me" ? "Me" : "Miranda"}: ${message}`)
  .join("\n")}
Miranda: `;

const getNextMessageReq = (
  messages: Message[],
  signal: AbortSignal
): Promise<{ generated_text: string }[]> =>
  fetch("https://api-inference.huggingface.co/models/EleutherAI/gpt-neo-2.7B", {
    signal,
    headers: {
      Authorization: `Bearer ${process.env.REACT_APP_HUGGINGFACE_TOKEN}`,
    },
    method: "POST",
    body: JSON.stringify({
      inputs: toAiMessage(messages),
      parameters: {
        return_full_text: false,
        max_new_tokens: 100,
        repetition_penalty: 50.1,
      },
    }),
  }).then((res) => {
    if (res.ok) return res.json();
    return wait(5000).then(() => getNextMessageReq(messages, signal));
  });

const getNextMessage = (
  messages: Message[],
  signal: AbortSignal
): Promise<string> =>
  getNextMessageReq(messages, signal).then(
    ([{ generated_text: generatedText }]) => {
      const message = generatedText
        .split("\n")
        .map((s) => s.replace(/^Miranda: ?/, ""))
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

export function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [theirName, setTheirName] = useState("Unknown");
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.side === "them") return;

    let cancelled = false;
    wait(1500).then(() => !cancelled && setOtherIsTyping(true));

    const c = new AbortController();
    getNextMessage(messages, c.signal).then((message) => {
      setOtherIsTyping(false);
      setMessages([...messages, { side: "them", message }]);
      if (message.includes("Miranda")) {
        setTheirName("Miranda");
        alert("You win!");
      }
      scrollToBottom();
    });

    return () => {
      cancelled = true;
      setOtherIsTyping(false);
      c.abort();
    };
  }, [messages, setOtherIsTyping]);
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
      <div className="objective">
        {theirName === "Unknown"
          ? "Objective: Find out their name"
          : "You won the game!"}
      </div>
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
