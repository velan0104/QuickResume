"use server";

import genAI from "@/lib/gemini";
import {
  GenerateSummaryInput,
  generateSummarySchema,
  GenerateWorkExperienceInput,
  generateWorkExperienceSchema,
  WorkExperience,
} from "@/lib/validation";

export async function generateSummary(input: GenerateSummaryInput) {
  // Stripe subscription work

  const { jobTitle, workExperiences, educations, skills } =
    generateSummarySchema.parse(input);

  const systemMessage = `
        You are a job resume generator AI. Your task is to write a professional introduction summary for a resume given the user's provided data.Only return the summary and do not include any other information in the response. Keep it consice and professional.
    `;

  const userMessage = `
        Please generate a professional resume summary from this data: 

        Job title: ${jobTitle || "N/A"}

        Work experience: ${workExperiences
          ?.map(
            (exp) => `
                Position: ${exp.position || "N/A"}  at ${exp.company || "N/A"} from ${exp.startDate || "N/A"} to ${exp.endDate || "Present"}

                Description: ${exp.description || "N/A"}
            `,
          )
          .join("\n\n")}

        Education: ${educations
          ?.map(
            (edu) => `
                Degree: ${edu.degree || "N/A"}  at ${edu.school || "N/A"} from ${edu.startDate || "N/A"} to ${edu.endDate || "N/A"}
            `,
          )
          .join("\n\n")}

          Skills: 
          ${skills}
    `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const aiResponse = await model.generateContent([systemMessage, userMessage]);

  if (!aiResponse) {
    throw new Error("Failed to generate AI response");
  }

  return aiResponse.response.text();
}

export async function generateWorkExperience(
  input: GenerateWorkExperienceInput,
) {
  const { description } = generateWorkExperienceSchema.parse(input);

  const systemMessage = `
        You are a job resume generator AI. Your task is to generate a single work experience entry based on the user input. Your response must adhere to the following structure. You can omit the fields if they can't be infered from the provided data, but don't add any new ones. If the start data or end date is provided then return that in the format mentioned below.

        Job title: <job title>
        Company: <company name>
        Start Date: <format: YYYY-MM-DD> (only if provided)
        End Date: <format: YYYY-MM-DD> (only if provided)
        Description: <an optimized description, might be infered from the job title if there is multiple description point than add disc bullet point format >
    `;

  const userMessage = `
   Please provide a work experience entry from this description:
   ${description}
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const aiResponse = await model.generateContent([systemMessage, userMessage]);

  if (!aiResponse) {
    throw new Error("Failed to generate AI response");
  }

  console.log("AI Response: ", aiResponse.response.text());

  return {
    position: aiResponse.response.text().match(/Job title: (.*)/)?.[1] || "",
    company: aiResponse.response.text().match(/Company: (.*)/)?.[1] || "",
    description: (
      aiResponse.response.text().match(/Description:([\s\S]*)/)?.[1] || ""
    ).trim(),
    startDate: aiResponse.response
      .text()
      .match(/Start Date: (\d{4}-\d{2}-\d{2})/)?.[1],
    endDate: aiResponse.response
      .text()
      .match(/End Date: (\d{4}-\d{2}-\d{2})/)?.[1],
  } satisfies WorkExperience;
}
