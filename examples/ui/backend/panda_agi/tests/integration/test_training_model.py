from panda_agi.train.training_model import TrainingModel
import asyncio
import dotenv


dotenv.load_dotenv()


if __name__ == "__main__":
    training_model = TrainingModel(name="new_gpt")
    # collect is now a synchronous method, no need for asyncio.run
    training_model.collect([
        {
            "role": "user",
            "content": "What's up?"
        },
        {
            "role": "assistant",
            "content": "All good, thanks!"
        }
    ])
