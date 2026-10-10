import type { Metadata } from "next";
import { ImportForm } from "@/components/monitoring/import-form";
import { SubmitPostForm } from "@/components/monitoring/submit-post-form";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireCurrentBank } from "@/lib/bank-context";
import { listActiveSources } from "@/lib/db/sources";
import { isAiConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Submit post" };

export default async function NewContentPage(props: PageProps<"/monitoring/new">) {
  const sp = await props.searchParams;
  const tab = sp.tab === "import" ? "import" : "single";
  const bank = await requireCurrentBank();
  const activeSources = await listActiveSources(bank.id);
  const aiConfigured = isAiConfigured();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={bank.name}
        title="Submit suspicious content"
        description={`The post will be verified only against ${bank.name}'s active trusted sources.`}
      />

      {!aiConfigured ? (
        <Alert variant="warning">
          <AlertTitle>AI analysis is not configured</AlertTitle>
          <AlertDescription>
            Posts can still be saved and imported. An administrator must set OPENAI_API_KEY to enable analysis.
          </AlertDescription>
        </Alert>
      ) : null}
      {activeSources.length === 0 ? (
        <Alert variant="warning">
          <AlertTitle>No active trusted sources</AlertTitle>
          <AlertDescription>
            Without trusted sources every claim will be classified as UNVERIFIED. Add sources under Trusted sources
            first.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="single">Single post</TabsTrigger>
          <TabsTrigger value="import">Bulk import</TabsTrigger>
        </TabsList>
        <TabsContent value="single">
          <Card>
            <CardContent>
              <SubmitPostForm aiConfigured={aiConfigured} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="import">
          <Card>
            <CardContent>
              <ImportForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
