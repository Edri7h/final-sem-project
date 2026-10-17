import { z } from 'zod';
export const emailSchema=z.string().trim().email().max(255).transform(x=>x.toLowerCase());
export const phoneSchema=z.string().regex(/^\+[1-9]\d{7,14}$/,'Use international format, e.g. +14155552671');
export const passwordSchema=z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);
export const vehicleInputSchema=z.object({registrationNumber:z.string().trim().min(2).max(20).transform(x=>x.toUpperCase().replace(/\s/g,'')),make:z.string().trim().min(1).max(80),model:z.string().trim().min(1).max(80),color:z.string().trim().min(1).max(40),description:z.string().max(500).optional().nullable()});
export const contactInputSchema=z.object({name:z.string().trim().min(2).max(120),phone:phoneSchema,relationship:z.string().max(60).optional()});
export const contactUpdateSchema=z.object({name:z.string().trim().min(2).max(120).optional(),phone:phoneSchema.optional(),relationship:z.string().max(60).optional()});
export const emergencySubmissionSchema=z.object({type:z.enum(['ACCIDENT','MEDICAL','FIRE','BREAKDOWN','OTHER']),description:z.string().trim().max(500).optional().default(''),confirmed:z.literal(true),latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional(),locationAccuracy:z.number().min(0).max(100000).nullable().optional()}).refine(x=>(x.latitude==null)===(x.longitude==null),{message:'Latitude and longitude must be sent together'});

