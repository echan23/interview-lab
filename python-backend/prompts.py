# prompts.py

def get_hint_prompt(code: str, hint_type: str) -> str:
    base_instruction = (
        "The coding problem is described in the comment block at the top of the code. "
        "The code below is the student's attempt. "
        "If there is no code present, say 'No code shown.' "
    )

    if hint_type == "weak":
        return (
            f"{base_instruction}\n\nCode:\n\n{code}\n\n"
            "Give a brief, encouraging nudge — are they on the right track? "
            "One short hint to guide their thinking, 2-3 sentences max. "
            "Don't give away the approach or solution. "
            "No greetings, no filler."
        )

    elif hint_type == "strong":
        return (
            f"{base_instruction}\n\nCode:\n\n{code}\n\n"
            "Give exactly 4 hints, separated by |||. Be concise and direct.\n\n"
            "Hint 1: Point out the key observation about the problem. What type of problem is this? What patterns or choices exist? 2-3 sentences.\n"
            "Hint 2: Name the approach or technique. Explain the high-level idea briefly. 2-3 sentences.\n"
            "Hint 3: Break down the core logic into concrete steps. Use newlines to separate each step. List out the specific operations, their costs or effects, and base cases on separate lines like:\nInsert: do X\nDelete: do Y\nReplace: do Z\nDon't give the full solution.\n"
            "Hint 4: Walk through the full solution step by step — data structure setup, initialization, how to fill in the logic, and the final return value. Include time/space complexity. Be thorough.\n\n"
            "No greetings, no filler. Return ONLY the 4 hints separated by |||.\n"
            "There must be exactly 3 ||| delimiters producing exactly 4 parts.\n"
            "Format: hint1|||hint2|||hint3|||hint4"
        )

    else:
        raise ValueError("Invalid hint type")



def get_question_prompt(difficulty: str, company: str, topic: str) -> str:
    if company == "Any Company" and topic == "Random Question":
        return f"Generate a {difficulty} coding interview question."

    elif company != "Any Company" and topic == "Random Question":
        return f"Generate a {difficulty} coding interview question asked by {company}."

    elif company == "Any Company" and topic != "Random Question":
        return f"Generate a {difficulty} {topic} coding interview question."

    else:
        return f"Generate a {difficulty} {topic} coding interview question asked by {company}."
