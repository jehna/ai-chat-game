# AI chat game prototype

This is a quick prototype game that uses the [EleutherAI GPT-Neo
2.7B](https://huggingface.co/EleutherAI/gpt-neo-2.7B) text generation neural
network as the main gameplay interaction. Not exactly GPT-3, but seems to work
well enough for the use case.

This prototype is using the model hosted at [HuggigFace
🤗](https://huggingface.co/), which uses input character count as main billing
criteria. This means all requests cost some money, so scaling up this may need
some monetisation from day one.

Try out the game at:
https://upbeat-beaver-dea14d.netlify.app/
## Development

Created using basic create-react app, so you know the drill:

```yarn && yarn start```

You need to add the environment variable `REACT_APP_HUGGINGFACE_TOKEN` to get
the API to work. Use `.env` file locally.