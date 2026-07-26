# Paragon

Paragon is a simple score tracking library for AI Dungeon scenarios. It was inspired by City of Heroes.

## How It Works

Paragon abstracts away more descriptive concepts (such as Dollars, Credits, etc.) in favour of ``Inf``. Inf can represent influence, information, or infamy or anything similar, such as "fame" or "rep".

You gain Inf based on what's going on within the game moment by moment. For example, if you rescue someone in your superhero adventure, the system will reward you by simply pushing "you gain X influence" to the AI's front memory so it can produce the appropriate outcome. 

Inf's API is very simple and straight forward. While inspired by City of Heroes, it's possible to use it in lower stakes slice-of-life scenarios. What you gain and lose is purely subjective. In theory, it's also should be possible to integrate it into the very systems it seeks to abstract. You can change everything by modifying the ``PLAYER_TABLE``, ``NPC_TABLE``, and ``PASSIVE_TABLE``.

## Background

This system has been in the works for *years* in varies other forms. An earlier project pushed more descriptive lore into context's front memory using a similar pattern matching system used here. Obviously, that was time consuming and prone to *plenty* of errors.

Admittedly, this was project was vibes all the way down because I just got burnt.

## License

I hereby waive this project's copyright and place it the public domain - see [UNLICENSE](LICENSE) for details.

