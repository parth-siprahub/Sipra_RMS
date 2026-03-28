**Meeting in SipraRMS-20260327\_153110-Meeting Recording**

March 27, 2026, 11:31AM

1h 1m 54s

**Raja PV** started transcription

**Parth Patojoshi**   0:03  
And then the timesheets that we're uploading and these files, how are they supposed to be stored? Is it supposed to be in the server directly or as an S3 bucket? Or should the URL be stored in a separate column in the table?

**Jaicind Santhibhavan**   0:08  
I.

**Parth Patojoshi**   0:38  
Yes, Sir.  
Yes, Sir.

**Jaicind Santhibhavan**   0:40  
OK. Uh, will that confuse Raja Sindhil?

**Raja PV**   0:45  
When we are in Jira track, we are importing Jira data, right? That should be OK, Nojay.

**Parth Patojoshi**   0:50  
Yes, and also Sir, another thing I missed out, we have a report section over here which shows the AWS Rs, the JIRA Rs and then the difference in percentage and what flag is there.

**Raja PV**   0:50  
OK.

**Jaicind Santhibhavan**   0:50  
It's your fault.  
OK.

**Raja PV**   1:01  
Hmm.  
Oh, OK, that is handled. OK, that is taken. Yeah.

**Jaicind Santhibhavan**   1:05  
Fantastic. Good. What do you want to talk now?

**Parth Patojoshi**   1:06  
S.  
So it's just the timesheet decisions that I need and I can finalize.

**Jaicind Santhibhavan**   1:10  
Yeah, yeah. So on this when I give you a file, can you put the Jira month?  
Which month's data it is, even if it is within, yeah.

**Raja PV**   1:21  
Hmm.

**Jaicind Santhibhavan**   1:26  
Oh, you have it here. Oh, OK, good. So you is it a selection or like you? How do you get that?

**Parth Patojoshi**   1:30  
S.  
Sir, the files that you had sent to me from the tempo, the January, February and March. I have these files which are the import thing. I still have to fix so but this is the data that I have used to populate here right now.

**Jaicind Santhibhavan**   1:36  
Oh.  
Yeah, yeah, OK.  
Hey.  
OK.

**Parth Patojoshi**   1:49  
This feature was working last night, but uh, it got messed up again.

**Jaicind Santhibhavan**   1:51  
Yep.  
So, so if I have last month's data now, you load it from the Excel, show it here. That's what you're doing.

**Parth Patojoshi**   2:00  
Exactly.

**Jaicind Santhibhavan**   2:01  
OK. Are you storing it in the database?

**Parth Patojoshi**   2:05  
Uh, yes, Sir.  
I can.

**Jaicind Santhibhavan**   2:07  
And if I give you March month's data again, will you override with the new data?

**Parth Patojoshi**   2:12  
Uh, ESL.

**Jaicind Santhibhavan**   2:13  
Then I think you're good. So, so I'm on the 1st March is a drop down, right?

**Parth Patojoshi**   2:21  
Yes Sir, it is. You just type out the first character and it auto fills.

**Jaicind Santhibhavan**   2:22  
OK.  
OK. Yeah. OK. Oh, that's fine. That's fine. So far I'm good. So when you get this data that is for March month, you are pulling out the data from the Excel and showing it here. And this is a summary if I'm right.

**Parth Patojoshi**   2:42  
Yesook.

**Jaicind Santhibhavan**   2:43  
So if the data record has 100 hours data, you show me the total and the breakdown is what you're showing me in the other reports tab, right?

**Parth Patojoshi**   2:55  
Yes, Sir.

**Jaicind Santhibhavan**   2:57  
Yeah, I'm good with this. Uh.  
Yes.

**Raja PV**   3:00  
Mm.

**Jaicind Santhibhavan**   3:02  
Whether this will this screen is only for importing where I can ask someone to just import the data, choose the month and import the data right? OK.

**Raja PV**   3:05  
Mhm.  
Yes, yes.  
Correct. Yes, yes, yes. But where do we start the calculation process path?

**Parth Patojoshi**   3:18  
Sir, regarding the billing, I spoke to Sreenath Sir about that as well. Sir, my question is it does not matter if how many hours are logged, it is just that there will be an attendance sheet that DCLI will be maintaining and at the end of the month they will be getting bid one way or the other.

**Raja PV**   3:22  
Mm.

**Parth Patojoshi**   3:36  
The whole reason we have time sheets and reports in our RMS platform is just so that we can see if there are any discrepancies and we can speak to the employee so.

**Jaicind Santhibhavan**   3:45  
No, no, no, no. That's a that's a wrong update. Uh, did she give you that input?

**Parth Patojoshi**   3:51  
Yes Sir, please I would love. I really need the billing input then.

**Jaicind Santhibhavan**   3:52  
No.  
OK, OK. Is there nearby?

**Parth Patojoshi**   3:58  
Uh, sorry, Sir.

**Jaicind Santhibhavan**   3:59  
Uh is uh uh Sridhar nearby? Just see if you can just pull him into that.

**Parth Patojoshi**   4:03  
Uh, yes, Sir. Uh, let me just ask.  
Yes, Sir.  
We're not.

**Senthil Natarajan**   4:13  
OK, sorry, I had some connectivity issues. So how is it the looking of the data comparison? Can you show me one second part?

**Parth Patojoshi**   4:23  
Excuse me, Sir, can you please repeat?

**Senthil Natarajan**   4:26  
No. How is how? Can you show me the comparison like the master data as well as the AWS and 0 details?

**Parth Patojoshi**   4:32  
Yes Sir. So as we had decided, once candidate reaches onboarded status in the employees page, all of the data will be visible and there is timesheets option where we are importing Jira tempo timesheet along with month.

**Senthil Natarajan**   4:48  
No, no.

**Parth Patojoshi**   4:49  
There is also AWS import and the reports are shown on this page. So there's a Jira Rs, AWS Rs.

**Jaicind Santhibhavan**   4:49  
Hey.

**Senthil Natarajan**   4:52  
Mm.  
OK, so this is to zero hours buildable, zero buildable. What is it again then AWS hours?

**Raja PV**   5:06  
Out of office.

**Parth Patojoshi**   5:06  
Uh, out of office.

**Senthil Natarajan**   5:09  
What is the third 1234th column?

**Parth Patojoshi**   5:12  
Uh, that is different, Sir. That is the difference between Jira Rs and AWSRS.

**Jaicind Santhibhavan**   5:17  
Thanks.  
Yeah.

**Senthil Natarajan**   5:20  
Uh, there is a tough.

**Raja PV**   5:20  
So the percentage is the difference?

**Senthil Natarajan**   5:24  
Zira buildable then AWS.  
OK, that's the end of hours. OK, so that is not it captured.

**Jaicind Santhibhavan**   5:34  
I.

**Parth Patojoshi**   5:35  
Yes Sir, the AWS upload. We have to decide on how the files are stored.

**Senthil Natarajan**   5:45  
I I don't get this. So similarly whatever you're importing in Jira, you can show the AWS hours here, right?

**Parth Patojoshi**   5:48  
Oh.  
Yes, Sir. Sir, just before you had.

**Senthil Natarajan**   5:58  
And the next column will be the difference. OK, for example, Abhilash Shumar calls the zero hours and the AWS hours. The next column will be the difference.

**Parth Patojoshi**   6:01  
Yes.

**Senthil Natarajan**   6:10  
And uh, so why is the AWS not shown here?

**Parth Patojoshi**   6:15  
Yes Sir, because the AWS timesheet import function is not working right now, I just.

**Raja PV**   6:20  
Oh.

**Jaicind Santhibhavan**   6:22  
Oh, OK.

**Senthil Natarajan**   6:24  
What? What? What do you mean by not working?

**Parth Patojoshi**   6:28  
Yes Sir, that was the file upload thing. I ignored that thing for a very long time and today I was checking. So I Sir, in the beginning of the call I had asked how we are we supposed to be storing the files that we're uploading, the resume, the job description, timesheets.  
Should it be stored in an S3 bucket in super base or should it? Should the URL be saved in a column?

**Jaicind Santhibhavan**   6:53  
OK, let me can we finish this part and go to the storage part later? So I I heard your question, but I wanted to come to it later.

**Senthil Natarajan**   6:53  
And.  
Yeah.

**Parth Patojoshi**   7:01  
Yes, Sir. Sure.

**Senthil Natarajan**   7:01  
OK.

**Jaicind Santhibhavan**   7:03  
So I look at this report uh from.  
There is. So on the top I I saw a month. Where did that go now? Yeah, yeah, yeah, yeah. Now here also there is a month because month is what important. So if I if this is actually good, but I want to question how are you calculating out of office?

**Raja PV**   7:11  
That is the other screen. OK.

**Parth Patojoshi**   7:12  
Yeah.

**Senthil Natarajan**   7:17  
Yes.

**Raja PV**   7:17  
Hm.

**Parth Patojoshi**   7:25  
Sir, that is there in the JIRA timesheet, right Sir?

**Jaicind Santhibhavan**   7:29  
Yeah, you should only pick zero one as out of office if they. OK, yeah, then this is good if you can bring.

**Senthil Natarajan**   7:33  
Yes.

**Parth Patojoshi**   7:33  
Hi, yes Sir, that is set.

**Senthil Natarajan**   7:36  
OK, insert a sample and maybe next time show that the parts OK or is it there already? Is it there already?

**Jaicind Santhibhavan**   7:41  
Yeah.

**Parth Patojoshi**   7:42  
Yes, Sir, I'll get it ready.  
Not yet, Sir.

**Senthil Natarajan**   7:46  
One of the one of the candidate you can insert some sample 01 data and then show it here.  
To check whether that it works.

**Parth Patojoshi**   7:56  
Yes Sir, that functionality is not working because the file upload is not set up yet. The only way we are getting the Jira and AWS data is through file uploads.

**Senthil Natarajan**   8:01  
OK, OK.

**Jaicind Santhibhavan**   8:03  
OK.  
Got it, got it. Senthil, this is good. Maybe not on day one because right now you're showing me billable hours or you're showing me data for March, OK?

**Senthil Natarajan**   8:09  
Mm.  
Mm mm.

**Jaicind Santhibhavan**   8:22  
Did Sri also join the call?  
Yeah, yeah, see, see. I just want to clarify one point. The billing data, the billing that we do to the customer is completely based on JIRA because earlier we had trouble. Do you remember?

**Parth Patojoshi**   8:26  
Yeah. Hi, Jason. Hi, bye.

**Senthil Natarajan**   8:27  
Yeah.  
OK.

**Parth Patojoshi**   8:31  
OK.  
OK.  
Yes, yes, yes, yeah, yeah.

**Jaicind Santhibhavan**   8:40  
Yeah, the JIRA did not match and we had a nightmare with it. So whatever we bill should reflect the same number on JIRA. Now for example, you're billing for 160 hours for a week.

**Parth Patojoshi**   8:44  
Correct.  
Mhm.  
Right.  
Hmm.

**Jaicind Santhibhavan**   8:55  
160 hours should be logged in Jira, not against Jira one any other task, even if it's an admin that's billable.

**Parth Patojoshi**   9:04  
Yeah, yeah, got it. Yeah.

**Jaicind Santhibhavan**   9:05  
OK, now the second thing is, are we expecting 160 hours in AWS? No. OK, but now the client is actually scrutinizing and asking the management saying.

**Parth Patojoshi**   9:14  
Mhm.

**Jaicind Santhibhavan**   9:21  
If somebody has very less hours in data, why are you billing me in AWS? OK, so this comparison will tell me that somebody has less hours in, but on one of this user path, if I click on it, can you show me that they twice?

**Parth Patojoshi**   9:26  
OK.  
Uh.

**Raja PV**   9:42  
In data drill down J.

**Jaicind Santhibhavan**   9:42  
This is good. Uh, till down till down.

**Raja PV**   9:46  
Hmm.

**Parth Patojoshi**   9:47  
OK. Uh, yes, Sir, I'll add that feature. I understood. So uh.

**Jaicind Santhibhavan**   9:50  
In in the report, see up to this, I think most of the cases are good. See one question I wanted to ask you is see March, I don't know how many days, but I'm just putting a number. Let's assume in March we had one holiday or something and we are expecting 160 of us.

**Parth Patojoshi**   9:58  
Mhm.  
Mhm.

**Senthil Natarajan**   10:03  
Jason, oh, OK. So on Jason, for your question, have you shared the data for?

**Parth Patojoshi**   10:11  
Not.

**Jaicind Santhibhavan**   10:11  
And it is.

**Senthil Natarajan**   10:11  
Dump the data dump for March. March, right?

**Jaicind Santhibhavan**   10:13  
Yes, I am. I am.

**Parth Patojoshi**   10:14  
Mm.

**Senthil Natarajan**   10:16  
For both AWS and Jira.

**Jaicind Santhibhavan**   10:17  
Correct. Yeah, yes.

**Senthil Natarajan**   10:20  
So do you have that box?

**Parth Patojoshi**   10:22  
Yes Sir, I have all the reference data.

**Senthil Natarajan**   10:24  
OK, OK.

**Parth Patojoshi**   10:26  
It's 176 hours, as per my understanding for a much, Jason, yeah.

**Jaicind Santhibhavan**   10:27  
Yeah.  
Oh yeah, yeah. So you you understood Sindhu what I'm saying. In March we are supposed to build 176 hours. Can you show us somewhere that March is 176 hours and you if you if somebody is not meeting that data was of 176, can you hide it?

**Senthil Natarajan**   10:30  
Mm.

**Parth Patojoshi**   10:47  
OK, so.

**Raja PV**   10:48  
OK, where do you have that number J 176 hours?

**Jaicind Santhibhavan**   10:51  
Yeah, that that's that's what I'm also thinking that can we keep it as a typable for the time being because that should consider the leave calendar and all those things.

**Raja PV**   10:54  
Oh.  
Right.  
Right.

**Senthil Natarajan**   10:58  
OK, right. No, no. So I I think I I need to jump off quickly, but my concern is that it's not displaying as I understand anything can be displayed and shown, but how do you handle the import data where you store all those things? So I think yeah, but.

**Raja PV**   10:59  
Uh.

**Jaicind Santhibhavan**   11:12  
I'll come to it. I'll come to it. I'll I'll I'll call that yeah.

**Senthil Natarajan**   11:15  
That is the concern. I am kind of guessing here, but you can go ahead, Jason, please.

**Jaicind Santhibhavan**   11:18  
M.  
Yeah, yeah. So now see from the current screen, if you give me a drill down also, I'm good with the data. Whatever you're showing, this is very good. OK.

**Raja PV**   11:29  
Hmm.

**Parth Patojoshi**   11:30  
Yes Sir. Uh about the Uh more data that we need to see. Uh we can have an option as in I can click on one of the employees that are there and a drop down opens where it will show you Jira data by date.

**Jaicind Santhibhavan**   11:32  
Yes.  
Yeah.  
Yeah.

**Parth Patojoshi**   11:45  
And and AWS data as well.

**Jaicind Santhibhavan**   11:45  
Yeah.  
Yeah, both like this.

**Raja PV**   11:47  
No part. Maybe we can keep it simple that we can discuss one idea. Quick idea is you give a link on Jira hours itself because automatically it will be filtered by the user as well as the hours, so it will show only that users.  
Data for that month from Jira, right? That we can think of.

**Jaicind Santhibhavan**   12:06  
Raja, I need a comparison like this. I need JITA hours and NWS hours day twice.

**Raja PV**   12:10  
Huh.  
Drill down.

**Jaicind Santhibhavan**   12:15  
Oh, yeah.

**Raja PV**   12:16  
Uh, OK, OK, OK, then it should be ideally here only. OK, but based on the month.

**Jaicind Santhibhavan**   12:22  
Yeah, based on no, no Monday's this. Currently this view is month wise. I want to see for one resource, one employee.

**Raja PV**   12:26  
Seven month. Yeah. Uh, then we can. OK.

**Parth Patojoshi**   12:30  
OK, so a drop down for this Jira data, AWS data and a sort function.

**Raja PV**   12:31  
OK.

**Jaicind Santhibhavan**   12:37  
No, no, no, no, no.

**Raja PV**   12:38  
No, no, no, no, no, no. OK. But I'll, I'll explain that we'll we'll just discuss that. That's not a problem. I understood that. I'll let you know how we can. I mean we have to decide on the UA part only because anyway we are storing that detailed data, right. Extracted imported data we are storing in a table. You remember we decided about having a unique identity.

**Parth Patojoshi**   12:39  
Sort by month.

**Jaicind Santhibhavan**   12:47  
Hmm.  
Yeah.  
Correct.

**Raja PV**   12:57  
That is what will be very useful here. You can directly check that OK.

**Parth Patojoshi**   13:02  
Yes, Sir. Under Jason. Uh.

**Raja PV**   13:03  
Yeah, we discuss that.

**Senthil Natarajan**   13:05  
I think, I think which I think whatever the format right now both Jira and AWS did, I think you the database should capture all the columns and should be mapped properly and if you have that.

**Raja PV**   13:14  
Yeah.  
Yeah.

**Senthil Natarajan**   13:22  
Then importing and getting whatever data is easier, right? You can do any query on the data, so that is not present right now. Is that the question Parth?

**Raja PV**   13:25  
Yes, yes, yes.

**Jaicind Santhibhavan**   13:25  
Yes, yes.

**Raja PV**   13:28  
Yes.

**Parth Patojoshi**   13:33  
Yes Sir, we are not taking the Excel sheet data and putting it in the database. We are saving the file as it is.

**Senthil Natarajan**   13:35  
So that.

**Jaicind Santhibhavan**   13:37  
Get up.

**Senthil Natarajan**   13:43  
OK, what is the issue you are facing? Like the the cloud should do it very easily. Now this is just cake work for it, right?

**Raja PV**   13:43  
Is it?

**Jaicind Santhibhavan**   13:44  
OK.

**Parth Patojoshi**   13:51  
Yes, Sir. Still working on it, Sir.

**Senthil Natarajan**   13:52  
Mm.  
Oh.

**Raja PV**   13:56  
OK, Parth, we'll discuss it later. Yeah, I have one more point to discuss. First, we'll discuss and finish off with Jason there.

**Senthil Natarajan**   13:58  
OK. OK, go ahead. Sorry. I mean, maybe I may be hijacking, but yeah.

**Parth Patojoshi**   14:02  
Uh.

**Jaicind Santhibhavan**   14:05  
Yeah, so Raja, you see all of us are clear. Like this data is good. I just need one more level of view where I can see one resource data for that month.

**Parth Patojoshi**   14:09  
If yeah.

**Raja PV**   14:11  
Yeah.  
Like.

**Parth Patojoshi**   14:16  
Yeah, under Jason in in our in our JIRA report I saw in our reports, right. I think there is a column right in our JIRA report. What is the actual hours? We don't have any column there for the month. I see somewhere in our JIRA report. I'll, I'll review once again.

**Raja PV**   14:16  
Start it.

**Jaicind Santhibhavan**   14:21  
OK.  
Yes, yes, it is there. The total hours is there and I think part is showing that that data here.

**Parth Patojoshi**   14:33  
Yeah.  
No, no, I'm saying like you know the actual, the month total hours. I'm not about talking about the candidate overall like you know the actual hours are coming that way.

**Jaicind Santhibhavan**   14:42  
Oh.  
No, no.  
That I I think it is not there because you know they can't do it now because.

**Parth Patojoshi**   14:49  
OK, understood. Understood. OK, then, then fine. OK, thank you.

**Jaicind Santhibhavan**   14:55  
So right now, even if it is not there, no, it's just a number we can recollect and just compare with it.

**Raja PV**   14:56  
Um.

**Parth Patojoshi**   15:00  
Correct. Yes, yes. One place that we can have that data entered.

**Jaicind Santhibhavan**   15:02  
OK.  
Yeah, yeah. So Raja, just give a text box or something here. If I enter 160, OK, and then should highlight the ones that don't have Jira hours or 160 hours, just highlight so that now we don't miss someone who has not logged 160 hours.

**Raja PV**   15:07  
Hmm.  
Huh. Huh.  
Mhm.  
Jay, for that should we have a kind of a configuration of setting table where we configure month wise? What are the maximum number of hours we need to compute?

**Jaicind Santhibhavan**   15:30  
That will be good. That's fantastic, yeah.

**Raja PV**   15:32  
Yeah.  
That is simple, no? Yeah, OK.

**Jaicind Santhibhavan**   15:34  
Yeah, simple. Even if you put a table, we will tell you how many hours. Just put that in the. Yeah. OK. Yeah. Sorry. Yeah. OK, that's. So now that's done. Now it comes to Bart's main question. OK.

**Raja PV**   15:37  
Yes. Yeah, that's it.  
OK.  
OK. Yeah.

**Jaicind Santhibhavan**   15:52  
Now Bob.

**Parth Patojoshi**   15:53  
Yes, Sir.

**Jaicind Santhibhavan**   15:54  
When you upload a profile, where are you storing it?

**Parth Patojoshi**   16:00  
Uh, candidates table and master employees table.

**Jaicind Santhibhavan**   16:06  
Uh, how about their uh other or some uh some identification that you will attach to the candidate when he's an umbrella?

**Parth Patojoshi**   16:13  
Documents.  
OK, so once candidate is in the pipeline it they will be given a unique ID.

**Jaicind Santhibhavan**   16:21  
Yes.  
Yes.

**Parth Patojoshi**   16:25  
OK.

**Jaicind Santhibhavan**   16:26  
No, no, this is all selection process when you go to employees table, yeah.

**Parth Patojoshi**   16:29  
Yes.

**Jaicind Santhibhavan**   16:31  
Sure you you also update their profile. You uh add. You can add some documents against the Uh employee, right?

**Parth Patojoshi**   16:39  
Yes, Sir.

**Jaicind Santhibhavan**   16:42  
Where are those documents saved?

**Parth Patojoshi**   16:45  
Those documents are still not uh saving. Those documents still not set up the are you referring to uh resume?

**Jaicind Santhibhavan**   16:50  
OK.  
OK.  
Yeah, resume is 1, maybe another card or spam card. One of those, yeah.

**Parth Patojoshi**   16:56  
Yes.  
All relevant documents. Yes, right now it is being stored in the superbase as just the URL.  
Storage link URL.

**Jaicind Santhibhavan**   17:09  
OK, so it's something like, uh, NS3, right? So Powerbase gives you a storage.

**Parth Patojoshi**   17:13  
Yes.

**Jaicind Santhibhavan**   17:15  
OK, how secure is that?

**Parth Patojoshi**   17:16  
It is secure, Sir.

**Jaicind Santhibhavan**   17:18  
OK, only your service can read that, right?

**Parth Patojoshi**   17:21  
Yes, Sir.

**Jaicind Santhibhavan**   17:23  
OK, yeah, then Raja, now there there should be a couple of folders there, one for employees. OK, so employee has a primary key ID no for 378 is their ID, right?

**Raja PV**   17:24  
Hmm.  
Hmm.  
Yeah, yeah.

**Parth Patojoshi**   17:35  
Yes.

**Jaicind Santhibhavan**   17:37  
In the bucket create one ID called 378 and this is not going to duplicate anything related to that employee should be inside that folder.

**Raja PV**   17:38  
Hmm.  
Hmm.  
OK.

**Jaicind Santhibhavan**   17:47  
OK.

**Raja PV**   17:48  
Hmm.  
OK.

**Jaicind Santhibhavan**   17:50  
OK, now this is for all employee related data that you're attaching should be there in the S3 bucket.

**Raja PV**   18:00  
OK, OK. Um.

**Jaicind Santhibhavan**   18:02  
OK, now coming back to the Excel that you're getting. OK, now what you need to do with the Excel is when you upload an Excel, take it to the server, just like how we did in our attrition, take it to the server, read the data, insert in your database and delete the file.

**Raja PV**   18:08  
Right.  
Mm.  
Mm.  
Hmm.  
Hmm hmm.  
OK.

**Jaicind Santhibhavan**   18:23  
Because we don't have to spend on storage of these files.

**Raja PV**   18:25  
Right, right.

**Jaicind Santhibhavan**   18:27  
It is not required, but we need the data in the database.

**Raja PV**   18:29  
Right.  
Correct. We need to store it, yeah.

**Jaicind Santhibhavan**   18:32  
Yeah, so most important part, if I give you a Jira data with 10 dates today and tomorrow I'm giving you another Excel, always the latest should take residence on those dates.

**Raja PV**   18:40  
Mm.  
Alright, OK.

**Jaicind Santhibhavan**   18:46  
OK, that's that's it. So did I answer your question on storage part?

**Raja PV**   18:47  
OK.

**Parth Patojoshi**   18:51  
Yes, Sir.

**Jaicind Santhibhavan**   18:53  
OK.  
Yeah, then if you import the AWS data and bring it here, we can start testing. Maybe Shiva also can take a look, so if you can pull Shiva up.

**Raja PV**   18:56  
OK, got it.

**Parth Patojoshi**   19:09  
OK.

**Raja PV**   19:10  
Mm.

**Jaicind Santhibhavan**   19:10  
I think this looks good, so I'll I'll quickly tell you what all part can you SOW job profiles, SOWS, resource request, everything is tested right?

**Parth Patojoshi**   19:22  
Yes Sir, everything up to candidate onboarded is tested already employees time sheets.

**Jaicind Santhibhavan**   19:24  
OK.  
Yeah, so.  
Employees. It is not employee template. It's a list of employees, right?

**Parth Patojoshi**   19:33  
Yes, Sir.

**Jaicind Santhibhavan**   19:34  
OK, up to that is can we can you host it somewhere Raja?

**Parth Patojoshi**   19:39  
Uh, yes, Sir, I'll.

**Raja PV**   19:40  
Yeah, I think he already has it, yeah.

**Parth Patojoshi**   19:42  
Yes, Sir, I'll host it.

**Jaicind Santhibhavan**   19:42  
OK. Thanks. Yeah. See if we can share it with you because I told you to take a look at it and you you can you finish the AWS import and this additional screen by no Monday.

**Parth Patojoshi**   19:48  
OK.

**Raja PV**   19:49  
Mhm.

**Parth Patojoshi**   19:57  
Yes, Sir.

**Jaicind Santhibhavan**   19:59  
OK then Raja, this this screen looks good, but you need to have a detailed screen where I can click on an employee going to his that month's date date breakdown if I have that.

**Raja PV**   20:01  
Mm.  
OK.  
Got it. Got it. Got it. Understood. Understood. Yeah.

**Jaicind Santhibhavan**   20:15  
Yeah, but.  
Oh.

**Raja PV**   20:17  
Yeah, that one. We need to design a table and we'll have to bring it out. Yeah, got it. Yeah.

**Jaicind Santhibhavan**   20:21  
Yeah.  
Uh, uh, OK, not but can you show?  
OK, employee edit. You will see the emails, right? The DCLA e-mail and the e-mail.

**Parth Patojoshi**   20:37  
Yes, Sir.

**Jaicind Santhibhavan**   20:39  
OK.

**Parth Patojoshi**   20:39  
TCLI here OK.

**Raja PV**   20:51  
Mm-hmm.

**Jaicind Santhibhavan**   20:55  
OK.  
Any other quick, quick observation? Uh, see, I'm uh, it looks good to me.

**Raja PV**   20:59  
OK, fine then so.

**Parth Patojoshi**   21:04  
Sir, regarding billing.

**Jaicind Santhibhavan**   21:06  
Yeah, no, no, no. Now you give me till here.

**Parth Patojoshi**   21:10  
OK.

**Jaicind Santhibhavan**   21:11  
OK, I told you one that you're going to give to Shiva today, which is up to employees. The second thing is the time sheets and the reports.

**Parth Patojoshi**   21:16  
Yes, it will.  
OK, Sir, yes.

**Jaicind Santhibhavan**   21:23  
OK, now after that I will tell you one expanded section because everybody's billing rate has to be key. That is a change to the employees now.

**Raja PV**   21:32  
Mm.

**Parth Patojoshi**   21:33  
Yes, Sir.

**Jaicind Santhibhavan**   21:35  
But not everybody's, yeah, only one more problem. Yeah, yeah. But there is a lot of complications there or at least no, we will get the billing, the finance guy involved at that stage.

**Raja PV**   21:35  
OK. That is one more column only, right? Yeah, yeah.  
Mhm.  
OK.

**Parth Patojoshi**   21:47  
Thank you.

**Jaicind Santhibhavan**   21:48  
OK, up to this report you give me by Monday and then I'll get you the finance guys to look at it.

**Parth Patojoshi**   21:55  
Yes, Sir.

**Jaicind Santhibhavan**   21:56  
So what I'll tell you if, uh, everywhere there's an export CSC. Yeah, yeah, so this summary, uh, no, the reports. Can you click on the reports?

**Raja PV**   22:01  
Mm.

**Jaicind Santhibhavan**   22:07  
OK, as of now I know we give this data to the.

**Raja PV**   22:08  
Mm.

**Jaicind Santhibhavan**   22:12  
Finance people. So they look at 0 hours and they reduce the out of office hours from that. OK and what they manipulate or what they do in Excel after that we give them the input.

**Raja PV**   22:14  
OK.  
Hmm.  
Hmm.  
OK.

**Jaicind Santhibhavan**   22:25  
OK, now let them use this data for this month, which is March month. OK. And then they will explain us how they are raising the billing and we will use that for the next step.

**Raja PV**   22:32  
Hmm.  
Mhm.  
Huh.

**Jaicind Santhibhavan**   22:42  
Got it.

**Parth Patojoshi**   22:44  
Yes, Sir.

**Jaicind Santhibhavan**   22:45  
So up to this should come on Monday.

**Parth Patojoshi**   22:48  
Yes, Sir.

**Jaicind Santhibhavan**   22:51  
Raja, can we migrate till employees data? Can we migrate the data?

**Raja PV**   22:53  
Yeah.  
Will employees migrate data means now or?

**Jaicind Santhibhavan**   23:00  
Oh, currently it is. Currently it isn't in in an exit.

**Parth Patojoshi**   23:02  
Sir, Sir, there is a very few changes remaining. Sir, I think I can get everything ready and then push it to production.

**Jaicind Santhibhavan**   23:11  
OK. OK. Bye.

**Senthil Natarajan**   23:12  
Apart.

**Parth Patojoshi**   23:14  
Yes, Sir.

**Senthil Natarajan**   23:16  
A lot. So can you spend time today and tomorrow and then see, you know?

**Parth Patojoshi**   23:23  
Yes, Sir, I will.

**Senthil Natarajan**   23:24  
So push it through.

**Parth Patojoshi**   23:26  
Yes, I'm for sure.

**Senthil Natarajan**   23:27  
E.

**Jaicind Santhibhavan**   23:28  
If you can give me on Sunday, uh, I'll be happy.

**Senthil Natarajan**   23:29  
And you can. So Jay, if you ping, please ping Jason the weekend you'll be available. I'm taking the.

**Parth Patojoshi**   23:36  
OK, shutdown.

**Jaicind Santhibhavan**   23:36  
Uh, tomorrow mom. First off I'm not, but after that full time I'm.

**Senthil Natarajan**   23:41  
Yeah, please follow up with Jason in case you have doubts.

**Jaicind Santhibhavan**   23:45  
Parth, call me on my mobile, Parth. You have my mobile, right?

**Parth Patojoshi**   23:45  
Yes, Sir.

**Senthil Natarajan**   23:46  
And then, uh, mhm.

**Parth Patojoshi**   23:49  
Uh, no, Sir. Can you please share number? I'll give it to Jason.

**Senthil Natarajan**   23:50  
Yeah.

**Jaicind Santhibhavan**   23:53  
Yeah, yeah, yeah, yeah. Just call.

**Parth Patojoshi**   23:55  
Yes, Sir. Thank you very much.

**Jaicind Santhibhavan**   23:57  
I may not check WhatsApp on this, that's why.

**Parth Patojoshi**   24:00  
Yes, Sir.

**Senthil Natarajan**   24:01  
So, so all your doubts cleared part now.

**Parth Patojoshi**   24:03  
Yes, Sir, all doubts cleared.

**Raja PV**   24:10  
OK, fine Bob, we will connect separately. I just have to understand how you have designed the tables. Yes, for the comparison and drill down option, we need to ensure that the table is intact, otherwise it will.

**Senthil Natarajan**   24:10  
Yeah.

**Parth Patojoshi**   24:13  
Yes, Sir.

**Senthil Natarajan**   24:14  
Mm.

**Parth Patojoshi**   24:21  
Yes, Sir.

**Raja PV**   24:23  
Yeah.

**Senthil Natarajan**   24:24  
Yeah, I think, yeah, we need your help, Raja. If we can capture the database design, yeah, that is going to the basis for all future work, I think based on the database, OK.

**Raja PV**   24:25  
Yes.  
Yeah, I'll, I'll, I just want to connect exactly, exactly.  
Yes, yes, yes.  
Yeah. So you have anything to be discussed with Jason or we can review him now?

**Parth Patojoshi**   24:43  
Nothing else from my end. Thank you very much, Sir.

**Raja PV**   24:46  
OK. OK, Dee. Thank you, Dee.

**Jaicind Santhibhavan**   24:46  
OK. Anything else stuck on the weekend? Call me after 1:30 or two. I should be completely free. OK. I can just join you. OK, Raja, I'll talk to you. Thanks, Sindhu. Thanks, Sri.

**Senthil Natarajan**   24:49  
OK.

**Parth Patojoshi**   24:51  
Yes.

**Senthil Natarajan**   24:52  
Yeah.

**Parth Patojoshi**   24:54  
OK, Sir.

**Senthil Natarajan**   24:57  
OK. Thanks, Jason.

**Raja PV**   24:59  
Yeah.  
Thanks. Thanks Sreenath. So Parth will continue here then.

**Parth Patojoshi**   25:00  
Thank you. Thank you. Bye, Justin.

**Senthil Natarajan**   25:02  
Do you need me, Raja? Do you need me, Raja?

**Parth Patojoshi**   25:04  
Yes Sir, we can continue.

**Raja PV**   25:05  
No need, no need. No need, no need. I'll I'll just discuss it.

**Senthil Natarajan**   25:07  
OK.

**Parth Patojoshi**   25:08  
Yes, Sir.

**Senthil Natarajan**   25:10  
Yeah.

**Parth Patojoshi**   25:10  
Which?

**Raja PV**   25:11  
OK, but so for now let me stop recording.

**Parth Patojoshi**   25:16  
Uh Sir, I need recording as well Sir. Recording transcription very important.

**Raja PV**   25:20  
Oh, OK, no worries. No worries. OK, so now part.

**Parth Patojoshi**   25:25  
So we start with the database.

**Raja PV**   25:27  
Thank you.  
No, no, no. First go to the application you are sharing, right? First, let me go one by one. Yeah, see here this one Jira hours. First is you need to change the order Jira hours, AWS hours.

**Parth Patojoshi**   25:31  
Yes, Sir.  
Jira hours, AWS hours.

**Raja PV**   25:43  
And right and billable is what is going to come from the common table what we are going to create. So we need to create one.  
I just say or have a table called.  
Building setup or I mean whichever name you want to you have it right where we need to just store the month. Maybe have the client name also OK even if right now we have only one client name. In future if more clients are coming in so we'll have client name month.

**Parth Patojoshi**   26:03  
OK.  
Yes, Sir.

**Raja PV**   26:16  
Right. Month, year and billing hours for that month. OK, so that one will be the billable column that will show for that month, right? Because now it is March. So if you configure for March, let's say 180 hours or 176 hours, that should be the one which should be shown.

**Parth Patojoshi**   26:20  
Yes, Sir.  
Yes, Sir.

**Raja PV**   26:36  
In the billable thing, right? So, so far you are with me, right? You are clear and that billable. So in this screen also the billable should always come from that table.

**Parth Patojoshi**   26:38  
Yes, yes, search.  
Yes.  
OK.

**Raja PV**   26:49  
OK, the new table you're going to create. OK, that is .1. That is a configurable table. Fine. So AWS servers will be coming from the AWS data upload, right? So we'll go one step back. Now can you go to the timesheet, upload the I mean.

**Parth Patojoshi**   27:01  
Yes, Sir.

**Raja PV**   27:07  
The menu. Yeah, now you have. Yes, fine. This is where you import. OK, one more comment is import should be the incoming arrow, right? I think the icon should be swapped, I guess.

**Parth Patojoshi**   27:20  
Hi, yes Sir, this is.

**Raja PV**   27:22  
Yeah, we'll die. Yeah. So just swap that. That also is fine. So then you get the data here.  
OK import. So what is it you are doing here? You are showing the data that is imported from that excel and then only they will confirm is it?

**Parth Patojoshi**   27:31  
OK.  
This said the Excel data. During the beginning in the imports there was some issue. That's why this shows just employ this way. But this is what ideally it is supposed to look like.

**Raja PV**   27:45  
Hmm.  
OK.  
OK, So what is that you are showing here? Is it a live record or what is this?

**Parth Patojoshi**   27:59  
Mhm.  
This is exactly as it appears in the Jira Excel file. Working days out of office days calculated based on Jira 1 total hours and average per day. But then I think this average per day is hard coded because that is what we are capping it at.

**Raja PV**   28:06  
Uh.  
OK.  
Oh.  
OK, one, can you just open the JIRA sheet here?

**Parth Patojoshi**   28:23  
Yes, Sir.

**Raja PV**   28:25  
Just compress.

**Parth Patojoshi**   28:30  
One second so we can check for.

**Raja PV**   28:38  
No, just open the sheet alone Jira sheet. This is AWS or sheet Jira.

**Parth Patojoshi**   28:43  
Uh, this is the Jira sheet, Sir.

**Raja PV**   28:45  
Oh, OK.

**Parth Patojoshi**   28:47  
Yes.

**Raja PV**   28:51  
OK, this is the JIRA sheet. OK, can you scroll up? OK, team.  
No, no. Scroll up. Scroll up. Stay on top. Stay on top. OK. Team user issue key logged. OK. Do you have Amazon AWS sheet also? Can you open that also?

**Parth Patojoshi**   29:00  
OK.  
Yes, Sir.

**Raja PV**   29:16  
The top is this is AW data.  
What is this?  
Productive. Unproductive. This is for which date? This is for the whole month.

**Parth Patojoshi**   29:29  
Yes Sir, this is 03/20. This is all that I have and in this sheet there is no date mentioned. That is one problem.

**Raja PV**   29:38  
Can you scroll to the right?

**Parth Patojoshi**   29:41  
Yes, Sir.

**Raja PV**   29:43  
OK, this is for the whole month per employee per record, right? One record is for a particular employee and his time time.

**Parth Patojoshi**   29:46  
Yes.

**Raja PV**   29:52  
Productive time recorded for the whole month, correct?

**Parth Patojoshi**   29:55  
Yes, Sir.

**Raja PV**   29:56  
So there is no breakup for that, OK.  
OK, fine. So what I would suggest is this sheet right? That is AWS sheet exactly store this one as is in the table for AWS. OK for that month.

**Parth Patojoshi**   30:16  
Yes.

**Raja PV**   30:18  
OK, one thing. So along with these columns, you need one more column for the month, correct?

**Parth Patojoshi**   30:26  
Yes, OK.

**Raja PV**   30:27  
For the month and for the client name also because for now it will be DCLA. But in future if we have more clients also we should have that option because we can store in the same table, right?

**Parth Patojoshi**   30:37  
Yes.

**Raja PV**   30:39  
Well, so this one is clear, right? You store it in the in a new table.  
OK, so when user is uploading.

**Parth Patojoshi**   31:07  
Yes.

**Raja PV**   31:08  
Correct. OK, so this is getting stored in the table. That is fine.

**Parth Patojoshi**   31:09  
Yes, Sir.

**Raja PV**   31:16  
So Jira table, how have you designed the Jira table?

**Parth Patojoshi**   31:20  
One second, Sir, I can show you.

**Raja PV**   31:23  
Yeah.

**Parth Patojoshi**   31:54  
Yes, Sir, this.

**Raja PV**   31:55  
Who designed it or Claude designed it?

**Parth Patojoshi**   31:57  
This is done by Claude, Sir. Majority of the work is done by Claude.

**Raja PV**   32:02  
Yeah, OK.  
AWS time sheet. So that table is already there, huh?

**Parth Patojoshi**   32:10  
Yes, Sir.

**Raja PV**   32:13  
Are you following the exactly same number of columns? Have you checked it?

**Parth Patojoshi**   32:15  
No, Sir.  
Not exactly the same.

**Raja PV**   32:20  
Oh.  
And how is it storing?

**Parth Patojoshi**   32:25  
Looks different here. Yes Sir, that's that's been a persistent issue for the past few days. Timesheets. Uh, the upload has been working, not working in between cloud. It just read the data and while testing it inserted the data so that is reflecting.

**Raja PV**   32:32  
Yeah.  
Hmm.

**Parth Patojoshi**   32:43  
Very constant issue, Sir.

**Raja PV**   32:46  
I think you need to.  
Have the control over it.

**Parth Patojoshi**   32:51  
Yes, Sir.

**Raja PV**   32:52  
AWS e-mail week start weekend. Can you compare the columns from this one to your Excel for AWS?

**Parth Patojoshi**   32:59  
It it is different Sir. There is no week start and weekend.

**Raja PV**   33:04  
Then.

**Parth Patojoshi**   33:04  
So that is a feature Cloud built by itself. It assumes that the AWS time sheet will be per week. So I'll change that Sir. I'll make it for the whole month.

**Raja PV**   33:16  
Yeah, see, just maybe you can give this XLS a input and ask it to create a table exactly the same column names and same data types, right? It should work, right? Yeah, get that done and ensure that you have employee ID. All those are fine for the month. You need month also, right?

**Parth Patojoshi**   33:24  
Yes, Sir. Yes, I'll I'll get that done, Sir.

**Raja PV**   33:35  
No.

**Parth Patojoshi**   33:36  
Yes, Sir.

**Raja PV**   33:36  
You don't need week, start weekend and all that that is not going to work here AWS because it is for the whole month, right?

**Parth Patojoshi**   33:42  
Yes, Sir. I'll remove that.

**Raja PV**   33:44  
So just have the same thing, exactly same structure. So it will be easy for you also to control when you are importing. You can always check whether the data is populated properly, everything right? OK.

**Parth Patojoshi**   33:55  
Yes, same columns that are present in Excel for both AWS and for Jira.

**Raja PV**   33:57  
Yes, yes, yes.  
Yeah, for Jira, can you show me the table?

**Parth Patojoshi**   34:04  
WS timesheet building records.

**Raja PV**   34:09  
You should be knowing your table names part.

**Parth Patojoshi**   34:12  
Yes, I haven't tested a lot.

**Raja PV**   34:20  
Now going forward, this will be very crucial because now only you are actually getting into an enterprise application. You need to know where data is stored, how the data is flowing. That is highly sensitive information you need to know.

**Parth Patojoshi**   34:32  
Yes, Sir.

**Raja PV**   34:33  
I think this is what you're showing, but I think this structure also you need to address because this is based on the screen's design, right?

**Parth Patojoshi**   34:40  
Hmm, I love.  
Hi, yes, Sir.

**Raja PV**   34:47  
It should be the other way around. First you need to have a column.

**Parth Patojoshi**   34:52  
Yes Sir, you're you had mentioned in the call that we are supposed to take the excel sheet data, store it as it is in the database and then on the server side all the processing has to be done.

**Raja PV**   35:01  
Exactly.  
Exactly, exactly. I think we have deviated in this area. So that's why you are showing this one and I don't think this is matching with what you're showing in the OR what we have in the Excel, right?

**Parth Patojoshi**   35:06  
I guess.  
No, Sir, it is not matching.

**Raja PV**   35:20  
Yeah, it should not. OK, do one thing. First is column start from the back end. OK Jira also you should ensure that the columns what you have in the sheet is there in this also this database also OK.  
So when you're importing, it should go and sit exactly in those columns. In addition to that, you need to have the billing month, whichever way you want to have some consistency. Like billing month should be same in AWS table and Jira table. OK.

**Parth Patojoshi**   35:35  
Yes, Sir.  
OK, Sir.

**Raja PV**   35:54  
And it should maybe you can have a month and year also because that is what you are going to store in the configuration table. Also you remember first you are going to design because that is the one you are going to pick and using that value only you are going to check the data from these two tables.

**Parth Patojoshi**   36:01  
Yes, Sir. Yes.

**Raja PV**   36:10  
For your computation purpose, right? So make it the same way. For example there if you are saying as year and month, here also you have two columns, one as year, one is month, OK.

**Parth Patojoshi**   36:12  
Correct.  
OK, Sir.

**Raja PV**   36:24  
And the column name also try to maintain the same so it will be easy and consistent, but always debug easily OK.

**Parth Patojoshi**   36:32  
Yes, Sir, understood.

**Raja PV**   36:33  
So, so far you're clear, right? So then once you put this and you're showing the data.  
OK, once you import, now you go to the screen what you are showing. Yeah, so scroll up here. You need to change. OK, data is stored. OK, this is a summary, right?

**Parth Patojoshi**   36:58  
Yes, Sir.

**Raja PV**   37:00  
Right.  
Yeah.  
So Jason wants to see the comparison between AWS and JIRA, correct?

**Parth Patojoshi**   37:09  
That is on reports now, Sir.

**Raja PV**   37:13  
Yeah, that is on reports. OK, this is timesheet. OK, first stick to timesheet. Yeah, let us stick to timesheets. OK, so here you will be importing data. So once you import the data, you want to show the data here.  
Then the simplest solution is just follow the same approach. Whatever you have it in the sheet, Excel sheet, have the same layout. That will be much simpler for you, right?

**Parth Patojoshi**   37:28  
Yes.  
And horizontal scroll.

**Raja PV**   37:41  
Yeah, that's simple. Freeze one or two columns in the front. First two columns or three columns, you freeze it, right? And then.

**Parth Patojoshi**   37:48  
Working days, out of office days, total hours and then per day analysis.

**Raja PV**   37:54  
Do you have all these columns in the sheet Excel sheet?

**Parth Patojoshi**   37:58  
Uh no Sir. Uh in the JIRA sheet here uh key JIRA one. All of these JIRA one is out of office uh status.

**Raja PV**   37:58  
Jira sheet. Can you go to Jira sheet?  
Uh.

**Parth Patojoshi**   38:11  
So based on that number of working days is calculated and out of office days is mentioned.

**Raja PV**   38:11  
Right.  
Correct. What I'm saying is this screen, this screen's functionality is you are going to import the data and show that data to the user. That's it, right?

**Parth Patojoshi**   38:33  
Yes, Sir.

**Raja PV**   38:36  
So why don't we follow the same structure what we have there? Or you want to show the summary because reports is what is going to show the summary, right? I'm just trying to understand that.

**Parth Patojoshi**   38:45  
Yes Sir, understood. So you're suggesting that it shows the same data as it is the same columns that are there and some columns have to be frozen. Which columns to be frozen here, Sir?

**Raja PV**   38:53  
Hmm.  
Employee. See, just stick with employee alone. All the others. I mean the employee alone, you freeze it. All the others can float, so you can scroll to the right and they can see, right?

**Parth Patojoshi**   39:12  
Yes, Sir. OK, done.

**Raja PV**   39:14  
Because here you are just downloading the data timesheet data. That's it, correct? Nothing else.

**Parth Patojoshi**   39:22  
Yes.

**Raja PV**   39:25  
So once it is downloaded, the section you are showing is from the database only, not from the excel. So data has reached or stored in the table and then you are querying that data for the month that is entered on top in the month field.  
And you are querying and showing it. That's it, correct?

**Parth Patojoshi**   39:43  
Yes.

**Raja PV**   39:44  
OK, perfect. Same go to click on the AWS track.

**Parth Patojoshi**   39:49  
AWS that is no data right now, yes.

**Raja PV**   39:50  
Yeah, there is nothing. OK. Here also the same approach, OK, here for the month you show everything for that month, OK.

**Parth Patojoshi**   39:55  
OK, Sir.  
Huh.

**Raja PV**   40:01  
So far clear, no doubts. But one thing, Parth, let us not deviate. OK, yeah.

**Parth Patojoshi**   40:02  
Yes, so for AWS.  
Hi yes Sir, I'll follow instructions to the dot unfollow Sir.

**Raja PV**   40:10  
Yeah.  
Tell me, tell me you have something.

**Parth Patojoshi**   40:13  
Uh, for AWS also same things, Sir. Uh, same columns that are there in Excel sheet.

**Raja PV**   40:17  
Yes, yes, yes, we are going to replicate the same column.

**Parth Patojoshi**   40:23  
OK.

**Raja PV**   40:23  
This is the first landing space. OK, you have the data. User is uploading the data. That data needs a landing space in our database. That is what we are creating. These are all timesheet data, right? You just store it, it reaches it, and then you delete the file. That's it.

**Parth Patojoshi**   40:27  
Hmm.  
Hmm.  
OK.  
Yes.

**Raja PV**   40:41  
And as Jason said, as many times the user uploads, you can keep on overriding the data, OK.

**Parth Patojoshi**   40:41  
OK.  
Yes.

**Raja PV**   40:49  
So far you are clear. Simple.

**Parth Patojoshi**   40:51  
Yes, Sir.

**Raja PV**   40:52  
OK, hold on. OK, now we go to reports. Can you click on reports?  
Yeah, here you go. This is where you are going to compute and all those, right?

**Parth Patojoshi**   41:05  
Yes, Sir.

**Raja PV**   41:05  
OK, now what is the exact point where we start the computation?  
Computation.  
Data is loaded. So what was your idea when you introduced the compute button or create? I mean calculate timesheet in the timesheet thing? Can you click on timesheet menu? I saw a button there. Yeah, calculate building. What is that? What is the purpose of that?

**Parth Patojoshi**   41:25  
Dummy it is dummy right now the billing.

**Raja PV**   41:30  
Why did you introduce that?

**Parth Patojoshi**   41:32  
Sir, that was mentioned during RMS specification call and it we had decided that Jason Sir and Sreenath Sir will have to discuss and then give input on billing.

**Raja PV**   41:37  
OK.

**Parth Patojoshi**   41:46  
So that's left as it is right now has to be, uh, implemented.

**Raja PV**   41:47  
OK.  
OK, fine then so.  
OK, now that data is loaded, right?  
Computation.  
That is the raw data you have.  
OK.  
So from here you can instead of in the timesheets instead of have the compute billing. What is that? Click on timesheets. Click on timesheets.

**Parth Patojoshi**   42:19  
Calendaring building, yes.

**Raja PV**   42:22  
So instead of that, what you can do is so.  
Um.  
Calculate building.  
Yeah, label should be fine. OK, compute or calculate the billing hours or compute billing hours. Label. You decide whichever is more suitable here. OK, so once here, once they see and check the data, they can click on this one, right?

**Parth Patojoshi**   42:51  
OK.

**Raja PV**   42:51  
Once they click on this button, now only the actual computation starts.

**Parth Patojoshi**   42:57  
OK.

**Raja PV**   42:58  
OK, because in the reports I don't think you're computing anything. Everything is a sample data I believe. Am I right?

**Parth Patojoshi**   43:04  
Yes Sir. On reports there is no computation, it is just for review.

**Raja PV**   43:08  
OK, So what you have to do is.  
Now, uh, OK, this is total lovers. Total lovers. Here also it's a Dumirova Dumi record.

**Parth Patojoshi**   43:23  
No Sir, this is from Jira, the timesheet that I that Claude had read automatically before.

**Raja PV**   43:31  
Oh.  
But the 80 hours from where it picked the 80 hours.

**Parth Patojoshi**   43:38  
One second, Sir. Let me check Shiva Prasad T.

**Raja PV**   43:40  
Yeah, just check something.

**Parth Patojoshi**   43:59  
This is March.

**Raja PV**   44:02  
Yes.  
No, I don't. It looks like a dummy data. That's why I'm.

**Parth Patojoshi**   44:09  
Show Prasad D.

**Raja PV**   44:11  
Oh, OK.

**Parth Patojoshi**   44:13  
So here there is.

**Raja PV**   44:14  
20\.  
Uh.

**Parth Patojoshi**   44:22  
OK.  
920 hours here.

**Raja PV**   44:28  
OK.  
OK, just filter to Prasad. We'll just check the data.  
Yeah, it says 80 hours and out of office is 8 hours.

**Parth Patojoshi**   44:42  
Hi yes Sir, this is dummy data again Sir out of office. There is one day out of office.

**Raja PV**   44:48  
See that's.  
OK, fine. Yeah, so.

**Parth Patojoshi**   44:54  
Yes Sir, I'll do that. That is mainly because of how the file upload is being handled.

**Raja PV**   45:04  
OK, can I have control of your screen? I just want to show.  
Should I request control or who's that? Take control? Yeah, yeah, take control.

**Parth Patojoshi**   45:12  
Ha, you have to request.

**Raja PV**   45:18  
I want to access your screen here. That screen screen. OK, yeah, control.

**Parth Patojoshi**   45:22  
Yes, that.

**Raja PV**   45:26  
Yeah, yeah. Can you take me to that screen?  
OK, so OK.  
So now you know how to import the data, correct? And you are going to allow the user to click calculate billing or calculate billing hours or whatever label we can decide finally. OK, you can have calculate or something. OK, so once user clicks on it, first thing you need to.

**Parth Patojoshi**   45:41  
Yes, Sir.  
Hmm.

**Raja PV**   45:56  
Is whether the data is uploaded for Jira as well as AWS. That should be a validation OK for March. If it doesn't March, it should be March or both OK.

**Parth Patojoshi**   46:02  
Yes.  
Yes, Sir.

**Raja PV**   46:10  
Ideally OK, they're going to upload it. OK, so you should ensure that these tables right back end tables have record for this month only then you should start the computation. Otherwise here itself you should say that I mean.

**Parth Patojoshi**   46:24  
Error proper error handling.

**Raja PV**   46:26  
Yeah, whatever the appropriate message you can give saying that this record is not available or AWS is not available, whatever. OK, whatever is not there, you just give a message. So up to that point we are clear. So once user clicks calculate then only the process starts. But are you going to hold the user in the front end or?

**Parth Patojoshi**   46:34  
Yes.

**Raja PV**   46:45  
You can do the computation at the back end because it will be kind of intensive calculation, right? So record.

**Parth Patojoshi**   46:50  
Yes Sir, the computation will be done in the back end and then it can be exported as a CSV.

**Raja PV**   46:55  
Yeah.  
Oh, one second, one second. What is there to compute here? I'm just watering now.

**Parth Patojoshi**   47:04  
Sir, that was only my question in the beginning. No Sir, company will pay one way or the other.

**Raja PV**   47:11  
Company will pay. What I'm thinking is we have the raw data in the table. Do we really need to compute? That's what I'm wondering. We do.  
We don't need to compute, right? Because we're not going to change anything. Already we have can you this one, right? This one is the.  
This one? Yeah. OK, so.

**Parth Patojoshi**   47:30  
This.

**Raja PV**   47:36  
Yeah, control control home.  
OK.  
OK, so.  
This is the computer number. These are all breakups for each day, correct?

**Parth Patojoshi**   48:03  
Yes, Sir. Sorry, Sir, I didn't understand what?

**Raja PV**   48:08  
No, what I mean is logged column column F is the overall computed hours for Amol Vankade 120 and these are all the breakup per day, correct?

**Parth Patojoshi**   48:18  
Yes, Sir.

**Raja PV**   48:19  
OK, so there is nothing much to compute. Only thing is we need to.  
OK, OK, so.  
Oh, I'm getting it so OK path. So what you need to do is when you ask the user to compute, you need to have a table where.  
No, you just understand carefully. You need to have a table where there is a user right team user and then.

**Parth Patojoshi**   48:51  
Hmm.

**Raja PV**   48:58  
The screen what you're showing, right? Can you take me to that screen? Because you have the data. Only thing is you need to transpose slightly. That's it. So working days. I don't know how you're computing the working days because I don't think there is a working days there, no.

**Parth Patojoshi**   49:03  
Yeah.  
Yes.  
Hi, Sir.

**Raja PV**   49:16  
So working days, are they asking working days to be shown? Is it part of the PRD?

**Parth Patojoshi**   49:22  
No, Sir.

**Raja PV**   49:25  
OK.  
OK, nothing wrong. We were we are going to design A configuration table, right setting table where I asked you to put number of billable hours. You remember in that in that add working days also let us define that. Let us have a provision to define that there for that month.

**Parth Patojoshi**   49:37  
Yes, yes.

**Raja PV**   49:46  
Right that we can bring it here.

**Parth Patojoshi**   49:47  
OK.  
OK, Sir.

**Raja PV**   49:52  
OK, so for each resource we'll say working days and working hours. If they don't want, we'll just remove that, but we will say working days and working hours.

**Parth Patojoshi**   50:03  
Are you suggesting that these statistics be saved in the DB somewhere so that whenever, wherever required we can get the data?

**Raja PV**   50:03  
Uh.  
Yes, I told you know initially we'll have a configuration table like maximum number of working hours per that month that will store you remember.

**Parth Patojoshi**   50:19  
Hmm.  
Yes, Sir.

**Raja PV**   50:26  
So there we will have working days also for the month.

**Parth Patojoshi**   50:29  
OK, done.

**Raja PV**   50:30  
OK, that will store. OK, now I'm just thinking about the UI part, how we'll show the UI. That is what I'm wondering.  
OK, this is the one, right? OK.  
Working hours. OK, forget about the working days. Huh. Forget about the working days, because in this report we don't have working days, so leave it aside for now, OK?

**Parth Patojoshi**   51:01  
OK.  
Yes.  
Yes, Sir.  
OK.

**Raja PV**   51:18  
New table. OK, you have a new table with this structure. Maybe the columns order is OK, whichever way you want to. OK, you don't even need billable in that because billable is always going to come from the other table, the configuration table, right?

**Parth Patojoshi**   51:21  
Yes, Sir.  
OK.  
OK, so the table structure will be employee Jira hours out of office, AWS hours difference percentage.

**Raja PV**   51:36  
Right.  
Yeah. And then difference percentage also we can store it because that is what the compute will do, OK.

**Parth Patojoshi**   51:48  
OK.

**Raja PV**   51:49  
Right. So when when user clicks compute, what you need to do is go to each record of that month, a particular user, right? Take one user at a time from employees. OK, so this is the process.

**Parth Patojoshi**   51:50  
Yes, Sir.  
Um.  
OK.

**Raja PV**   52:04  
Which should happen in the back end. Take one record from employees active record, go to the Jira table, right?

**Parth Patojoshi**   52:11  
Hmm.

**Raja PV**   52:13  
And for that particular user, whatever is the Jira hours he has put in for that month.

**Parth Patojoshi**   52:19  
Huh.

**Raja PV**   52:20  
Right. Take it. And then what is the out of office server? That is a Jira one or something? That code you know, right? What are the out of office servers? Just take it, right? And then AWS servers you know from the other table, correct?

**Parth Patojoshi**   52:25  
Yes.  
Do you know what?  
Yes.

**Raja PV**   52:34  
Take it, put it in this what is that new table? OK and also you need to identify the difference between this servers and that tower OK.

**Parth Patojoshi**   52:44  
That computation will be done.

**Raja PV**   52:47  
Yes, that computation you need and also the percentage you need.

**Parth Patojoshi**   52:50  
OK.

**Raja PV**   52:51  
And I don't understand why you have this flag. What is the significance of the flag?

**Parth Patojoshi**   52:54  
The flag is for since reports is for us to know whether the employee is not logged hours, whether they have to be reminded to fill Jira or if there is if they have less than 50 percentage then we have to warn them.

**Raja PV**   53:02  
Hmm.

**Parth Patojoshi**   53:11  
So for that there's a flag.

**Raja PV**   53:13  
OK, so you know what are the text to be shown based on the value percentage and all those for this?

**Parth Patojoshi**   53:19  
Uh yes Sir, it will only be uh missing data. In that case uh that's uh Jason said I had mentioned that there are people in charge who are uh just there to tell people to fill JIRA and update.  
So.

**Raja PV**   53:37  
OK, have the flag column there in the database, no worries. And for now, whatever comments you want to add, put it there and we'll show it here. OK, maybe any changes, we'll just change the logic when we are populating the data, OK.

**Parth Patojoshi**   53:39  
Yes.  
OK, done.  
Yes, Sir.

**Raja PV**   53:52  
Yeah right. So the same thing. So for all the records in employees, one by one you are going to go to Jira, compute these values and take the value from AWS, put it here and then show the difference. These two are manually computed right? Virtual columns kind of. When you are entering the data then only you know what is the difference then you.  
To put these two values also in the table and also the flag right flag. Also you you need to have a subroutine kind of thing based on these values and differences. You know there is going to be a static value for the flag, right? Whether it is overbuild or underworked or whatever, I don't know the value.  
Is it on the text OK?

**Parth Patojoshi**   54:29  
Yes, Sir.

**Raja PV**   54:32  
So once you everything, everything is intact, that's all.

**Parth Patojoshi**   54:33  
Yes, Sir, understood.  
Yes.

**Raja PV**   54:39  
And based on this you can enter these values right? For that particular month, total number of employees, it can be taken from Jira, the distinct employees to put that table right. You have created a new table.

**Parth Patojoshi**   54:55  
Yes, Sir.

**Raja PV**   54:55  
For Jira import. So for that month you know based on the number of distinct employees in Jira table, you can identify total number of employees, correct?

**Parth Patojoshi**   55:05  
Yes.

**Raja PV**   55:06  
That logic we can even cross check with Jason also whether it should be from Jira or AWS. Finally it's a distinct list of employees and with Jira data with AWS data.

**Parth Patojoshi**   55:13  
OK.

**Raja PV**   55:20  
And flag the red flag. I mean this one you have to check the logic which one you are going to flag as red then.

**Parth Patojoshi**   55:24  
Right now, yes Sir, that's just dummy since AWS upload is not working.

**Raja PV**   55:29  
Sorry.

**Parth Patojoshi**   55:30  
Uh, the flagged red and green is just dummy right now because we don't have AWS data for comparison.

**Raja PV**   55:37  
I'm wondering if everything is dummy. I'm slightly confused here because I'm not seeing the data right. See what happened. It's not working OK.

**Parth Patojoshi**   55:43  
Yes, Sir.  
I I will get demo fully demo ready, yes.

**Raja PV**   55:49  
Yeah, yeah.  
Yes, but don't deviate path because right now we don't have time to correct ourselves, right? So whatever we are saying, just do it step by step and show that everything is done. OK, so up to this if you're doing then most of the things are ready for them.

**Parth Patojoshi**   55:57  
Yes, Sir.  
OK, Sir.  
Yes, Sir.

**Raja PV**   56:08  
OK, for everything you need to have a table, proper structure of the table and this one also a new table, right? You understood this concept, right? This one should be a separate table, right? And what happened here? I lost the data here.

**Parth Patojoshi**   56:09  
Yes, Sir.  
Yes, Sir, I understood.

**Raja PV**   56:25  
Yeah.  
Yeah, so here we need to have one more option. It is just to drill down, correct?

**Parth Patojoshi**   56:39  
Yes, Sir.

**Raja PV**   56:40  
You can have AI mean the industry standard is there right a arrow kind of a box with a 45 degree arrow. If you click on it, it pops up. It shows a pop up where you can show the details of this particular user's record.

**Parth Patojoshi**   56:53  
OK.

**Raja PV**   56:56  
Because you have that record from Jira and AWS, correct? Which you downloaded or imported, correct?

**Parth Patojoshi**   57:00  
Hmm.  
Yes.

**Raja PV**   57:04  
So from here you know which user it belongs to. You know the month also. These two can be parameters and open a pop up where you show that record what you are showing in timesheet, right?

**Parth Patojoshi**   57:18  
Ha, exactly as it appears in G and AWS time sheets.

**Raja PV**   57:19  
Show that record only for that Abhilash alone. In that case only for Abhilash alone. Got it.

**Parth Patojoshi**   57:27  
OK.

**Raja PV**   57:27  
So Abhilash may have 3-4 records. One is for out of office, one is for some project or Jira tickets, whatever he has worked on right that you will be showing as a separate panel and on top you can show the AWS record because AWS is also will always have only one record for that user, correct?

**Parth Patojoshi**   57:34  
Hmm.  
Yes.

**Raja PV**   57:44  
So on top show AWS record. At the bottom panel you show Abhirash Malka and then all the records of that user for that month from Jira table. OK.

**Parth Patojoshi**   57:57  
OK, so next to the employee name there will be a pop-up option which opens a small box over here which will have AWS data as it is seen in Excel and Jira data as it is seen in Excel.

**Raja PV**   58:00  
Yeah.  
Yes.  
Exactly. That's it. Because he wants to see the comparison, right? So it'll be easy for them to validate. Also, see, just look at it from the HR perspective. If they want to validate, they can quickly open it, they can cross check, validate and that pop up whatever you are showing, right?

**Parth Patojoshi**   58:15  
Yes.

**Raja PV**   58:27  
It should be movable point \#1. Why I'm saying movable is they can drag it to the top and they can compare the value from this one and that one. Got it.

**Parth Patojoshi**   58:36  
OK, Sir.

**Raja PV**   58:38  
OK, or one more option you can do is to make their life easy. This section, right?

**Parth Patojoshi**   58:45  
Yes, Sir.

**Raja PV**   58:46  
This row alone you can show it as a header on that pop up also only that row alone. The same value you can push it there, show it in the top, show it on top of the pop up right first panel, second panel is AWS data.

**Parth Patojoshi**   58:57  
OK.

**Raja PV**   59:01  
Third panel is Jira data, because Jira has multiple records, right?

**Parth Patojoshi**   59:02  
OK.  
Yes.

**Raja PV**   59:06  
So they can see everything in one shot in the same screen, they can easily validate. Got it?

**Parth Patojoshi**   59:12  
Yes, Sir.

**Raja PV**   59:14  
So far you're clear, right?

**Parth Patojoshi**   59:16  
Sir, how about a drop down? So Abhilash Malka just expands onto the screen and it has AWS data and Jira data. These columns appear as it is.

**Raja PV**   59:19  
Hmm.  
Oh, readability will be challenging. No path. Are you expecting any challenges doing a pop up?

**Parth Patojoshi**   59:32  
And then uh.  
Uh, no challenges particularly, Sir.

**Raja PV**   59:41  
Hmm.  
In that case, I would suggest that one. It'll be easy, right? Because see, the reason I'm saying is once he clicks on it, it'll open. So you log the user within that screen, right? And if he wants to do anything else from the other screen, he has to close it. So make the pop-up model.

**Parth Patojoshi**   59:45  
OK, since you.  
Yes.

**Raja PV**   1:00:01  
OK.

**Parth Patojoshi**   1:00:02  
OK, Sir, understood. Yes.

**Raja PV**   1:00:03  
But if you allow them to expand it, then wherever they go, you should ensure that this one is closed. All those things you need to handle. I know Claud is going to take care of it, but it should take it. I mean take care of it very prudently, otherwise you'll be in a problem, right? So if you make it as a modular model pop up, it will be much simpler because you control the user's behavior there.

**Parth Patojoshi**   1:00:16  
Yes, Sir, I understand.  
OK Sir, understood.

**Raja PV**   1:00:23  
They will have to close it and come back and then only they'll do something else, right?

**Parth Patojoshi**   1:00:27  
Yes.

**Raja PV**   1:00:29  
If you achieve this.  
95% of the project is complete.

**Parth Patojoshi**   1:00:37  
I'll get this done, Sir, yes.

**Raja PV**   1:00:39  
OK, so ensure that you are not deviating, ensure that stick to the points whatever we discussed.

**Parth Patojoshi**   1:00:40  
I'm motivated to work now.

**Raja PV**   1:00:46  
Follow it. So once we are done, I think we are in a good shape. But before that, maybe Jason wants you to post up to employees, right?

**Parth Patojoshi**   1:00:56  
Yes, Sir.

**Raja PV**   1:00:58  
So if it is, is it working the testing completely?

**Parth Patojoshi**   1:00:59  
Hi yes Sir, up to employees everything is working.

**Raja PV**   1:01:03  
OK, then upload it and send the link to link in the group and inform Jason that it is up and running so he can inform Shiva to OK.

**Parth Patojoshi**   1:01:13  
Yes, you're done.

**Raja PV**   1:01:15  
OK, so this is what it is. So ensure that you just focus on these things. It should be fine. OK.  
OK.

**Parth Patojoshi**   1:01:23  
Yes, Sir, I'll do that.

**Raja PV**   1:01:24  
Yeah. OK. Thank you. Bye, bye.

**Parth Patojoshi**   1:01:27  
Thank you very much, Sir.

**Raja PV**   1:01:28  
So in from the team, no call today because we have discussed enough and they have just worked on the, I mean cloud course I guess. So nothing much to discuss today. OK. Yeah. Bye, bye. Yeah, bye.

**Parth Patojoshi**   1:01:36  
Yes, Sir.  
OK, Sir, I will follow.

**Raja PV**   1:01:41  
Yeah, bye.

**Parth Patojoshi**   1:01:41  
Thank you very much Sir. Also Sir, please send call transcript Sir.

**Raja PV**   1:01:42  
See you. Yeah.

**Parth Patojoshi**   1:01:49  
OK, Sir. Thank you very much, Sir. Have a good evening.

**Raja PV** stopped transcription